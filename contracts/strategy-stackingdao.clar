;; strategy-stackingdao.clar
;; Karambit - Strategy adapter untuk Stacking DAO
;; Stacking DAO liquid stacking - STX earn BTC yield, wrapped sebagai stSTX

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u500))
(define-constant ERR-ZERO-AMOUNT (err u501))
(define-constant ERR-WITHDRAW-FAILED (err u502))

(define-data-var total-deposited uint u0)
;; Default APY 8% = 800 bps
(define-data-var current-apy uint u800)

;; Deposit ke Stacking DAO
(define-public (deposit (amount uint))
  (begin
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    ;; TODO: (try! (contract-call? .stacking-dao stake amount))
    (var-set total-deposited (+ (var-get total-deposited) amount))
    (ok amount)
  )
)

;; Withdraw dari Stacking DAO
(define-public (withdraw (amount uint))
  (begin
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= (var-get total-deposited) amount) ERR-WITHDRAW-FAILED)
    ;; TODO: (try! (contract-call? .stacking-dao unstake amount))
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
    ;; TODO: harvest stSTX rewards
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
