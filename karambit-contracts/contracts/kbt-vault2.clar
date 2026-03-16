;; kbt-vault2.clar
(define-constant CONTRACT-OWNER tx-sender)
(define-constant PRECISION u100000000)
(define-constant ERR-NOT-AUTHORIZED  (err u401))
(define-constant ERR-ZERO-AMOUNT     (err u400))
(define-constant ERR-INSUFFICIENT    (err u402))
(define-constant ERR-NOT-MATURE      (err u411))
(define-constant ERR-ALREADY-MATURE  (err u412))
(define-constant ERR-PAUSED          (err u503))

(define-data-var maturity-block uint u0)
(define-data-var is-initialized bool false)
(define-data-var is-paused bool false)
(define-data-var total-locked-sy uint u0)
(define-data-var total-yield-collected uint u0)

(define-read-only (get-maturity-block) (var-get maturity-block))
(define-read-only (get-total-locked) (var-get total-locked-sy))
(define-read-only (get-total-yield) (var-get total-yield-collected))
(define-read-only (get-initialized) (var-get is-initialized))

(define-read-only (is-mature)
  (and (var-get is-initialized)
       (>= block-height (var-get maturity-block))))

(define-read-only (blocks-until-maturity)
  (let ((mat (var-get maturity-block)))
    (if (>= block-height mat) u0 (- mat block-height))))

(define-read-only (get-implied-apy)
  (let ((locked (var-get total-locked-sy))
        (yield  (var-get total-yield-collected))
        (elapsed (if (> block-height u0) block-height u1))
        (blocks-per-year u52560))
    (if (or (is-eq locked u0) (is-eq elapsed u0))
      u0
      (/ (* (/ (* yield PRECISION) locked) blocks-per-year) elapsed))))

;; initialize tanpa owner check - siapapun bisa init (hanya bisa dipanggil sekali)
(define-public (initialize (target-maturity-block uint))
  (begin
    (asserts! (not (var-get is-initialized)) ERR-NOT-AUTHORIZED)
    (asserts! (> target-maturity-block block-height) ERR-ZERO-AMOUNT)
    (var-set maturity-block target-maturity-block)
    (var-set is-initialized true)
    (try! (contract-call? .kbt-pt set-maturity-block target-maturity-block))
    (try! (contract-call? .kbt-yt set-maturity-block target-maturity-block))
    (ok true)))

(define-public (mint-pt-yt (sy-amount uint))
  (let ((caller tx-sender))
    (asserts! (var-get is-initialized) ERR-NOT-AUTHORIZED)
    (asserts! (not (var-get is-paused)) ERR-PAUSED)
    (asserts! (not (is-mature)) ERR-ALREADY-MATURE)
    (asserts! (> sy-amount u0) ERR-ZERO-AMOUNT)
    (try! (contract-call? .kbt-sy transfer
      sy-amount caller (as-contract tx-sender)))
    (try! (contract-call? .kbt-pt mint sy-amount caller))
    (try! (contract-call? .kbt-yt mint sy-amount caller))
    (var-set total-locked-sy (+ (var-get total-locked-sy) sy-amount))
    (print { event: "mint-pt-yt", user: caller, amount: sy-amount })
    (ok { pt: sy-amount, yt: sy-amount })))

(define-public (redeem-pt (pt-amount uint))
  (let ((caller tx-sender))
    (asserts! (is-mature) ERR-NOT-MATURE)
    (asserts! (> pt-amount u0) ERR-ZERO-AMOUNT)
    (try! (contract-call? .kbt-pt burn pt-amount caller))
    (try! (as-contract (contract-call? .kbt-sy transfer
      pt-amount tx-sender caller)))
    (ok pt-amount)))

(define-public (redeem-early (amount uint))
  (let ((caller tx-sender))
    (asserts! (not (is-mature)) ERR-ALREADY-MATURE)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (try! (contract-call? .kbt-pt burn amount caller))
    (try! (contract-call? .kbt-yt burn amount caller))
    (try! (as-contract (contract-call? .kbt-sy transfer
      amount tx-sender caller)))
    (var-set total-locked-sy (- (var-get total-locked-sy) amount))
    (ok amount)))

(define-public (claim-yield)
  (let ((caller tx-sender)
        (claimable (contract-call? .kbt-yt get-pending-yield caller)))
    (asserts! (> claimable u0) ERR-ZERO-AMOUNT)
    (try! (contract-call? .kbt-yt reset-pending-yield caller))
    (try! (as-contract (contract-call? .kbt-ststx transfer
      claimable tx-sender caller none)))
    (ok claimable)))

(define-public (collect-and-distribute-yield (new-yield-amount uint))
  (let ((total-yt (unwrap-panic (contract-call? .kbt-yt get-total-supply)))
        (current-index (contract-call? .kbt-yt get-yield-index)))
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (> new-yield-amount u0) ERR-ZERO-AMOUNT)
    (asserts! (> total-yt u0) ERR-ZERO-AMOUNT)
    (var-set total-yield-collected
      (+ (var-get total-yield-collected) new-yield-amount))
    (let ((index-delta (/ (* new-yield-amount PRECISION) total-yt)))
      (try! (contract-call? .kbt-yt update-yield-index
        (+ current-index index-delta))))
    (ok true)))

(define-public (set-paused (paused bool))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set is-paused paused)
    (ok true)))
