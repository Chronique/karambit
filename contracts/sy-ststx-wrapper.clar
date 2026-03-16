;; sy-ststx-wrapper.clar
;; Standardized Yield Wrapper untuk stSTX (StackingDAO)
;; Mirip konsep SY token di Pendle — standarisasi interface yield-bearing asset
;; 
;; Fungsi utama:
;;   deposit  : stSTX → sySTX
;;   redeem   : sySTX → stSTX
;;   get-exchange-rate : berapa stSTX per 1 sySTX (naik seiring waktu)

;; ============================================================
;; Constants & Errors
;; ============================================================

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-ZERO-AMOUNT    (err u400))
(define-constant ERR-INSUFFICIENT   (err u402))
(define-constant ERR-TRANSFER-FAILED (err u500))

;; Precision: 8 decimals (sama dengan STX/stSTX)
(define-constant PRECISION u100000000)

;; ============================================================
;; Storage
;; ============================================================

;; Total sySTX yang beredar
(define-data-var total-supply uint u0)

;; Total stSTX yang disimpan di vault ini
(define-data-var total-assets uint u0)

;; Balance sySTX per user
(define-map sy-balances principal uint)

;; ============================================================
;; Read-only Functions
;; ============================================================

;; Exchange rate: berapa unit stSTX yang didapat per 1 sySTX
;; Saat awal = 1:1, lalu naik seiring akumulasi yield dari StackingDAO
(define-read-only (get-exchange-rate)
  (let ((supply (var-get total-supply))
        (assets (var-get total-assets)))
    (if (is-eq supply u0)
      PRECISION  ;; default 1:1 kalau belum ada deposit
      (/ (* assets PRECISION) supply)
    )
  )
)

;; Berapa sySTX yang didapat kalau deposit sejumlah stSTX
(define-read-only (preview-deposit (ststx-amount uint))
  (let ((rate (get-exchange-rate)))
    (/ (* ststx-amount PRECISION) rate)
  )
)

;; Berapa stSTX yang didapat kalau redeem sejumlah sySTX
(define-read-only (preview-redeem (sy-amount uint))
  (let ((rate (get-exchange-rate)))
    (/ (* sy-amount rate) PRECISION)
  )
)

(define-read-only (get-balance (account principal))
  (default-to u0 (map-get? sy-balances account))
)

(define-read-only (get-total-supply) (var-get total-supply))
(define-read-only (get-total-assets) (var-get total-assets))

;; ============================================================
;; Public Functions
;; ============================================================

;; Deposit stSTX, terima sySTX
;; User harus approve contract ini di stSTX contract dulu
(define-public (deposit (ststx-amount uint))
  (let (
    (caller tx-sender)
    (sy-amount (preview-deposit ststx-amount))
  )
    (asserts! (> ststx-amount u0) ERR-ZERO-AMOUNT)
    (asserts! (> sy-amount u0) ERR-ZERO-AMOUNT)

    ;; Transfer stSTX dari user ke contract ini
    ;; Ganti dengan address stSTX contract StackingDAO yang sebenarnya
    (try! (contract-call? .ststx-token transfer
      ststx-amount caller (as-contract tx-sender) none))

    ;; Mint sySTX ke user
    (map-set sy-balances caller
      (+ (get-balance caller) sy-amount))

    ;; Update state
    (var-set total-supply (+ (var-get total-supply) sy-amount))
    (var-set total-assets (+ (var-get total-assets) ststx-amount))

    (ok sy-amount)
  )
)

;; Redeem sySTX, terima stSTX kembali (+ yield yang terakumulasi)
(define-public (redeem (sy-amount uint))
  (let (
    (caller tx-sender)
    (user-balance (get-balance caller))
    (ststx-amount (preview-redeem sy-amount))
  )
    (asserts! (> sy-amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= user-balance sy-amount) ERR-INSUFFICIENT)

    ;; Burn sySTX dari user
    (map-set sy-balances caller (- user-balance sy-amount))

    ;; Update state
    (var-set total-supply (- (var-get total-supply) sy-amount))
    (var-set total-assets (- (var-get total-assets) ststx-amount))

    ;; Transfer stSTX ke user
    (try! (as-contract (contract-call? .ststx-token transfer
      ststx-amount tx-sender caller none)))

    (ok ststx-amount)
  )
)

;; Transfer sySTX antar user (diperlukan vault contract)
(define-public (transfer (amount uint) (sender principal) (recipient principal))
  (let (
    (sender-balance (get-balance sender))
  )
    ;; Hanya bisa dipanggil oleh sender sendiri atau vault contract
    (asserts! (or (is-eq tx-sender sender)
                  (is-eq tx-sender .vault)) ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= sender-balance amount) ERR-INSUFFICIENT)

    (map-set sy-balances sender (- sender-balance amount))
    (map-set sy-balances recipient
      (+ (default-to u0 (map-get? sy-balances recipient)) amount))

    (ok true)
  )
)

;; ============================================================
;; Admin: sync yield dari StackingDAO
;; Dipanggil secara periodik untuk update total-assets
;; sesuai dengan yield yang sudah diterima dari stacking
;; ============================================================
(define-public (sync-yield (new-total-assets uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (>= new-total-assets (var-get total-assets)) ERR-INSUFFICIENT)
    (var-set total-assets new-total-assets)
    (ok true)
  )
)
