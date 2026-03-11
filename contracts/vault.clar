;; vault.clar
;; sBTC Yield Aggregator - Main Vault Contract
;; Menerima sBTC dari user, auto-route ke strategy dengan APY tertinggi

;; ========================
;; CONSTANTS
;; ========================

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-INSUFFICIENT-BALANCE (err u101))
(define-constant ERR-ZERO-AMOUNT (err u102))
(define-constant ERR-STRATEGY-NOT-FOUND (err u103))
(define-constant ERR-PAUSED (err u104))

;; Fee: 10% dari yield (dalam basis points)
(define-constant PERFORMANCE-FEE-BPS u1000)
(define-constant BPS-DENOMINATOR u10000)

;; ========================
;; DATA VARS
;; ========================

;; Total sBTC yang dikelola vault
(define-data-var total-assets uint u0)

;; Total shares yang beredar
(define-data-var total-shares uint u0)

;; Apakah vault sedang di-pause
(define-data-var is-paused bool false)

;; Alamat treasury untuk terima fee
(define-data-var treasury-address principal CONTRACT-OWNER)

;; Strategy aktif saat ini (max 4 strategy)
(define-data-var active-strategy-count uint u0)

;; ========================
;; DATA MAPS
;; ========================

;; Jumlah shares yang dimiliki tiap user
(define-map user-shares
  principal
  uint
)

;; Daftar strategy yang terdaftar
(define-map strategies
  uint  ;; strategy-id
  {
    name: (string-ascii 64),
    enabled: bool,
    allocation-bps: uint,    ;; berapa % dari total asset di strategy ini
    total-deposited: uint    ;; total sBTC di strategy ini
  }
)

;; ========================
;; PRIVATE FUNCTIONS
;; ========================

;; Hitung jumlah shares untuk amount sBTC yang didepositkan
(define-private (calculate-shares (amount uint))
  (let (
    (current-total-assets (var-get total-assets))
    (current-total-shares (var-get total-shares))
  )
    (if (is-eq current-total-assets u0)
      ;; Deposit pertama: 1 share = 1 sBTC (in satoshis)
      amount
      ;; Deposit selanjutnya: shares proporsional
      (/ (* amount current-total-shares) current-total-assets)
    )
  )
)

;; Hitung jumlah sBTC untuk amount shares yang di-redeem
(define-private (calculate-assets (shares uint))
  (let (
    (current-total-assets (var-get total-assets))
    (current-total-shares (var-get total-shares))
  )
    (if (is-eq current-total-shares u0)
      u0
      (/ (* shares current-total-assets) current-total-shares)
    )
  )
)

;; Check apakah caller adalah owner
(define-private (is-owner)
  (is-eq tx-sender CONTRACT-OWNER)
)

;; ========================
;; PUBLIC FUNCTIONS
;; ========================

;; Deposit sBTC ke vault
;; User memanggil ini untuk mulai earn yield
(define-public (deposit (amount uint))
  (begin
    ;; Validasi
    (asserts! (not (var-get is-paused)) ERR-PAUSED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)

    ;; Hitung shares untuk user ini
    (let ((shares-to-mint (calculate-shares amount)))

      ;; Transfer sBTC dari user ke vault
      ;; TODO: ganti dengan actual sBTC contract call saat integrasi
      

      ;; Update shares user
      (map-set user-shares
        tx-sender
        (+ (default-to u0 (map-get? user-shares tx-sender)) shares-to-mint)
      )

      ;; Update totals
      (var-set total-assets (+ (var-get total-assets) amount))
      (var-set total-shares (+ (var-get total-shares) shares-to-mint))

      (ok shares-to-mint)
    )
  )
)

;; Withdraw sBTC dari vault
;; User burn shares dan dapat sBTC kembali
(define-public (withdraw (shares uint))
  (begin
    ;; Validasi
    (asserts! (not (var-get is-paused)) ERR-PAUSED)
    (asserts! (> shares u0) ERR-ZERO-AMOUNT)

    (let (
      (user-share-balance (default-to u0 (map-get? user-shares tx-sender)))
      (assets-to-return (calculate-assets shares))
    )
      ;; Pastikan user punya cukup shares
      (asserts! (>= user-share-balance shares) ERR-INSUFFICIENT-BALANCE)

      ;; Hitung performance fee dari yield
      ;; (simplified - akan di-improve dengan tracking cost basis)

      ;; Transfer sBTC kembali ke user
      ;; TODO: ganti dengan actual sBTC contract call
      

      ;; Burn shares user
      (map-set user-shares
        tx-sender
        (- user-share-balance shares)
      )

      ;; Update totals
      (var-set total-assets (- (var-get total-assets) assets-to-return))
      (var-set total-shares (- (var-get total-shares) shares))

      (ok assets-to-return)
    )
  )
)

;; ========================
;; READ-ONLY FUNCTIONS
;; ========================

;; Cek share balance user
(define-read-only (get-shares (user principal))
  (ok (default-to u0 (map-get? user-shares user)))
)

;; Cek total assets dalam vault
(define-read-only (get-total-assets)
  (ok (var-get total-assets))
)

;; Cek total shares beredar
(define-read-only (get-total-shares)
  (ok (var-get total-shares))
)

;; Hitung nilai sBTC dari shares user
(define-read-only (get-user-assets (user principal))
  (let ((shares (default-to u0 (map-get? user-shares user))))
    (ok (calculate-assets shares))
  )
)

;; Hitung price per share (dalam satoshis, scaled 1e8)
(define-read-only (get-price-per-share)
  (let (
    (total-a (var-get total-assets))
    (total-s (var-get total-shares))
  )
    (if (is-eq total-s u0)
      (ok u100000000)  ;; 1.0 initial price
      (ok (/ (* total-a u100000000) total-s))
    )
  )
)

;; ========================
;; ADMIN FUNCTIONS
;; ========================

;; Pause vault (emergency)
(define-public (set-paused (paused bool))
  (begin
    (asserts! (is-owner) ERR-NOT-AUTHORIZED)
    (var-set is-paused paused)
    (ok true)
  )
)

;; Update treasury address
(define-public (set-treasury (new-treasury principal))
  (begin
    (asserts! (is-owner) ERR-NOT-AUTHORIZED)
    (var-set treasury-address new-treasury)
    (ok true)
  )
)