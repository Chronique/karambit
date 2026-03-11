;; strategy-zest.clar
;; Karambit - Strategy adapter untuk Zest Protocol
;; Zest adalah lending protocol di Stacks - sBTC earn yield dari bunga pinjaman

;; ========================
;; CONSTANTS
;; ========================

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u200))
(define-constant ERR-ZERO-AMOUNT (err u201))
(define-constant ERR-DEPOSIT-FAILED (err u202))
(define-constant ERR-WITHDRAW-FAILED (err u203))

;; ========================
;; DATA VARS
;; ========================

;; Total sBTC yang sedang di-deploy ke Zest
(define-data-var total-deposited uint u0)

;; APY simulasi dalam basis points (700 = 7%)
;; Nanti ini akan di-fetch dari Zest contract secara on-chain
(define-data-var current-apy uint u700)

;; ========================
;; IMPLEMENT STRATEGY TRAIT
;; ========================

;; Deposit sBTC ke Zest lending pool
(define-public (deposit (amount uint))
  (begin
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)

    ;; TODO: uncomment saat integrasi mainnet Zest
    ;; (try! (contract-call? .zest-protocol supply amount))

    ;; Update tracking
    (var-set total-deposited (+ (var-get total-deposited) amount))
    (ok amount)
  )
)

;; Withdraw sBTC dari Zest lending pool
(define-public (withdraw (amount uint))
  (begin
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= (var-get total-deposited) amount) ERR-WITHDRAW-FAILED)

    ;; TODO: uncomment saat integrasi mainnet Zest
    ;; (try! (contract-call? .zest-protocol withdraw amount))

    (var-set total-deposited (- (var-get total-deposited) amount))
    (ok amount)
  )
)

;; Total value yang dikelola strategy ini
(define-read-only (get-total-value)
  (ok (var-get total-deposited))
)

;; Current APY dalam basis points
;; 1% = 100 bps | 7% = 700 bps
(define-read-only (get-apy)
  (ok (var-get current-apy))
)

;; Harvest yield dari Zest, kirim ke vault
(define-public (harvest)
  (begin
    ;; TODO: implement actual yield harvesting dari Zest
    ;; Untuk sekarang return 0 (belum ada yield aktual)
    (ok u0)
  )
)

;; ========================
;; ADMIN FUNCTIONS
;; ========================

;; Update APY (dipanggil oleh keeper/bot secara periodik)
(define-public (update-apy (new-apy uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set current-apy new-apy)
    (ok true)
  )
)