;; strategy-trait.clar
;; Karambit - Interface standar untuk semua yield strategy

(define-trait strategy-trait
  (
    (deposit (uint) (response uint uint))
    (withdraw (uint) (response uint uint))
    (get-total-value () (response uint uint))
    (get-apy () (response uint uint))
    (harvest () (response uint uint))
  )
)
