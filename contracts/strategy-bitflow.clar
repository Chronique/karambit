;; strategy-bitflow.clar
;; Karambit - Strategy adapter untuk BitFlow DEX
;; BitFlow adalah DEX di Stacks - sBTC earn yield dari LP fees

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u400))
(define-constant ERR-ZERO-AMOUNT (err u401))
(define-constant ERR-WITHDRAW-FAILED (err u402))

(define-data-var total-deposited uint u0)
;; Default APY 10% = 1000 bps
(define-data-var current-apy uint u1000)

;; Deposit sBTC ke BitFlow LP pool
(define-public (deposit (amount uint))
  (begin
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    ;; TODO: (try! (contract-call? .bitflow-pool add-liquidity amount))
    (var-set total-deposited (+ (var-get total-deposited) amount))
    (ok amount)
  )
)

;; Withdraw sBTC dari BitFlow LP pool
(define-public (withdraw (amount uint))
  (begin
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= (var-get total-deposited) amount) ERR-WITHDRAW-FAILED)
    ;; TODO: (try! (contract-call? .bitflow-pool remove-liquidity amount))
    (var-set total-deposited (- (var-get total-deposited) amount))
    (ok amount)
  )
)

(define-read-only (get-total-value)
  (ok (var-get total-deposited))
)

(define-read-only (get-apy)
  (ok (var-get current-apy))
)

(define-public (harvest)
  (begin
    ;; TODO: harvest LP fees dari BitFlow
    (ok u0)
  )
)

(define-public (update-apy (new-apy uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set current-apy new-apy)
    (ok true)
  )
)
