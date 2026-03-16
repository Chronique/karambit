;; pt-ststx-token.clar
;; Principal Token (PT) — SIP-010 Fungible Token
;;
;; Representasi hak atas principal (pokok) dari deposit.
;; Saat maturity tercapai, 1 PT bisa diredeem jadi 1 underlying asset (stSTX).
;; Selama periode berlangsung, PT TIDAK menerima yield — yield semua ke YT.
;;
;; Penamaan contoh: PT-stSTX-DEC2025
;; Artinya: Principal Token untuk stSTX yang expire Desember 2025

;; ============================================================
;; SIP-010 Trait
;; ============================================================

(impl-trait .karambit-trait.sip-010-trait)

;; ============================================================
;; Constants
;; ============================================================

(define-constant CONTRACT-OWNER tx-sender)
(define-constant VAULT-CONTRACT .vault)

(define-constant ERR-NOT-AUTHORIZED  (err u401))
(define-constant ERR-ZERO-AMOUNT     (err u400))
(define-constant ERR-INSUFFICIENT    (err u402))
(define-constant ERR-WRONG-RECIPIENT (err u403))

;; Token metadata
(define-constant TOKEN-NAME "PT-stSTX-DEC2025")
(define-constant TOKEN-SYMBOL "PT-stSTX")
(define-constant TOKEN-DECIMALS u8)
(define-constant TOKEN-URI (some u"https://karambit.app/tokens/pt-ststx-dec2025.json"))

;; Maturity: block height target (~Desember 2025)
;; Stacks menghasilkan ~1 block per 10 menit, ~144/hari
;; Hitung dari deployment block + durasi yang diinginkan
(define-data-var maturity-block uint u0) ;; di-set saat deploy oleh vault

;; ============================================================
;; Storage
;; ============================================================

(define-data-var total-supply uint u0)
(define-map balances principal uint)
(define-map allowances { owner: principal, spender: principal } uint)

;; ============================================================
;; SIP-010 Read-only
;; ============================================================

(define-read-only (get-name) (ok TOKEN-NAME))
(define-read-only (get-symbol) (ok TOKEN-SYMBOL))
(define-read-only (get-decimals) (ok TOKEN-DECIMALS))
(define-read-only (get-token-uri) (ok TOKEN-URI))
(define-read-only (get-total-supply) (ok (var-get total-supply)))

(define-read-only (get-balance (account principal))
  (ok (default-to u0 (map-get? balances account)))
)

;; ============================================================
;; Custom Read-only
;; ============================================================

(define-read-only (get-maturity-block) (var-get maturity-block))

(define-read-only (is-mature)
  (>= block-height (var-get maturity-block))
)

(define-read-only (blocks-until-maturity)
  (let ((mat (var-get maturity-block)))
    (if (>= block-height mat)
      u0
      (- mat block-height)
    )
  )
)

;; ============================================================
;; SIP-010 Transfer
;; ============================================================

(define-public (transfer
  (amount uint)
  (sender principal)
  (recipient principal)
  (memo (optional (buff 34)))
)
  (let ((sender-bal (default-to u0 (map-get? balances sender))))
    (asserts! (is-eq tx-sender sender) ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= sender-bal amount) ERR-INSUFFICIENT)

    (map-set balances sender (- sender-bal amount))
    (map-set balances recipient
      (+ (default-to u0 (map-get? balances recipient)) amount))

    (match memo m (print m) true)
    (ok true)
  )
)

;; ============================================================
;; Mint & Burn — hanya bisa dipanggil Vault
;; ============================================================

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender VAULT-CONTRACT) ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)

    (map-set balances recipient
      (+ (default-to u0 (map-get? balances recipient)) amount))
    (var-set total-supply (+ (var-get total-supply) amount))

    (ok true)
  )
)

(define-public (burn (amount uint) (owner principal))
  (let ((owner-bal (default-to u0 (map-get? balances owner))))
    (asserts! (is-eq tx-sender VAULT-CONTRACT) ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= owner-bal amount) ERR-INSUFFICIENT)

    (map-set balances owner (- owner-bal amount))
    (var-set total-supply (- (var-get total-supply) amount))

    (ok true)
  )
)

;; ============================================================
;; Admin: set maturity (hanya sekali, oleh vault saat deploy)
;; ============================================================

(define-public (set-maturity-block (target-block uint))
  (begin
    (asserts! (is-eq tx-sender VAULT-CONTRACT) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (var-get maturity-block) u0) ERR-NOT-AUTHORIZED) ;; hanya set sekali
    (asserts! (> target-block block-height) ERR-ZERO-AMOUNT)
    (var-set maturity-block target-block)
    (ok true)
  )
)
