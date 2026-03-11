;; strategy-router.clar
;; Karambit - Router yang memilih strategy dengan APY tertinggi

;; ========================
;; CONSTANTS
;; ========================

(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u300))
(define-constant ERR-NO-STRATEGY (err u301))

;; ========================
;; DATA VARS
;; ========================

;; Currently active strategy (0=zest, 1=bitflow, 2=stackingdao)
(define-data-var active-strategy uint u0)

;; APY per strategy in basis points
(define-data-var apy-zest uint u700)
(define-data-var apy-bitflow uint u1000)
(define-data-var apy-stackingdao uint u800)

;; ========================
;; READ-ONLY FUNCTIONS
;; ========================

;; Get current active strategy
(define-read-only (get-active-strategy)
  (ok (var-get active-strategy))
)

;; Get all strategy APYs
(define-read-only (get-all-apys)
  (ok {
    zest: (var-get apy-zest),
    bitflow: (var-get apy-bitflow),
    stackingdao: (var-get apy-stackingdao)
  })
)

;; Calculate which strategy has highest APY
(define-read-only (get-best-strategy)
  (let (
    (z (var-get apy-zest))
    (b (var-get apy-bitflow))
    (s (var-get apy-stackingdao))
  )
    (if (and (>= b z) (>= b s))
      (ok u1)  ;; bitflow menang
      (if (>= s z)
        (ok u2) ;; stackingdao menang
        (ok u0) ;; zest menang (default)
      )
    )
  )
)

;; ========================
;; ADMIN FUNCTIONS
;; ========================

;; Called by keeper bot
(define-public (update-apy-zest (new-apy uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set apy-zest new-apy)
    ;; Auto rebalance ke strategy terbaik
    (try! (rebalance))
    (ok true)
  )
)

;; Update APY bitflow
(define-public (update-apy-bitflow (new-apy uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set apy-bitflow new-apy)
    (try! (rebalance))
    (ok true)
  )
)

;; Update APY stackingdao
(define-public (update-apy-stackingdao (new-apy uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set apy-stackingdao new-apy)
    (try! (rebalance))
    (ok true)
  )
)

;; Rebalance: switch to highest APY strategy
(define-public (rebalance)
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (let (
      (z (var-get apy-zest))
      (b (var-get apy-bitflow))
      (s (var-get apy-stackingdao))
    )
      (if (and (>= b z) (>= b s))
        (begin (var-set active-strategy u1) (ok true))
        (if (>= s z)
          (begin (var-set active-strategy u2) (ok true))
          (begin (var-set active-strategy u0) (ok true))
        )
      )
    )
  )
)
