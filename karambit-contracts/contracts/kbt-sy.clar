;; kbt-sy.clar
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-ZERO-AMOUNT    (err u400))
(define-constant ERR-INSUFFICIENT   (err u402))
(define-constant PRECISION u100000000)

(define-data-var total-supply uint u0)
(define-data-var total-assets uint u0)
(define-map sy-balances principal uint)

(define-read-only (get-exchange-rate)
  (let ((supply (var-get total-supply))
        (assets (var-get total-assets)))
    (if (is-eq supply u0)
      PRECISION
      (/ (* assets PRECISION) supply))))

(define-read-only (preview-deposit (ststx-amount uint))
  (/ (* ststx-amount PRECISION) (get-exchange-rate)))

(define-read-only (preview-redeem (sy-amount uint))
  (/ (* sy-amount (get-exchange-rate)) PRECISION))

(define-read-only (get-balance (account principal))
  (default-to u0 (map-get? sy-balances account)))

(define-read-only (get-total-supply) (var-get total-supply))
(define-read-only (get-total-assets) (var-get total-assets))

(define-public (deposit (ststx-amount uint))
  (let ((caller tx-sender)
        (sy-amount (preview-deposit ststx-amount)))
    (asserts! (> ststx-amount u0) ERR-ZERO-AMOUNT)
    (asserts! (> sy-amount u0) ERR-ZERO-AMOUNT)
    (try! (contract-call? .kbt-ststx transfer
      ststx-amount caller (as-contract tx-sender) none))
    (map-set sy-balances caller (+ (get-balance caller) sy-amount))
    (var-set total-supply (+ (var-get total-supply) sy-amount))
    (var-set total-assets (+ (var-get total-assets) ststx-amount))
    (ok sy-amount)))

(define-public (redeem (sy-amount uint))
  (let ((caller tx-sender)
        (user-balance (get-balance caller))
        (ststx-amount (preview-redeem sy-amount)))
    (asserts! (> sy-amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= user-balance sy-amount) ERR-INSUFFICIENT)
    (map-set sy-balances caller (- user-balance sy-amount))
    (var-set total-supply (- (var-get total-supply) sy-amount))
    (var-set total-assets (- (var-get total-assets) ststx-amount))
    (try! (as-contract (contract-call? .kbt-ststx transfer
      ststx-amount tx-sender caller none)))
    (ok ststx-amount)))

(define-public (transfer (amount uint) (sender principal) (recipient principal))
  (let ((sender-balance (get-balance sender)))
    (asserts! (or (is-eq tx-sender sender)
                  (is-eq tx-sender .kbt-vault)) ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= sender-balance amount) ERR-INSUFFICIENT)
    (map-set sy-balances sender (- sender-balance amount))
    (map-set sy-balances recipient
      (+ (default-to u0 (map-get? sy-balances recipient)) amount))
    (ok true)))

(define-public (sync-yield (new-total-assets uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (>= new-total-assets (var-get total-assets)) ERR-INSUFFICIENT)
    (var-set total-assets new-total-assets)
    (ok true)))
