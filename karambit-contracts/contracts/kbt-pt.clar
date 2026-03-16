;; kbt-pt.clar
(impl-trait .kb-sip010.sip-010-trait)

(define-constant VAULT-CONTRACT .kbt-vault2)
(define-constant ERR-NOT-AUTHORIZED  (err u401))
(define-constant ERR-ZERO-AMOUNT     (err u400))
(define-constant ERR-INSUFFICIENT    (err u402))
(define-constant TOKEN-NAME "PT-stSTX-DEC2025")
(define-constant TOKEN-SYMBOL "PT-stSTX")
(define-constant TOKEN-DECIMALS u8)
(define-constant TOKEN-URI (some u"https://karambit.app/tokens/pt-ststx.json"))

(define-data-var total-supply uint u0)
(define-data-var maturity-block uint u0)
(define-map balances principal uint)

(define-read-only (get-name) (ok TOKEN-NAME))
(define-read-only (get-symbol) (ok TOKEN-SYMBOL))
(define-read-only (get-decimals) (ok TOKEN-DECIMALS))
(define-read-only (get-token-uri) (ok TOKEN-URI))
(define-read-only (get-total-supply) (ok (var-get total-supply)))
(define-read-only (get-balance (account principal))
  (ok (default-to u0 (map-get? balances account))))
(define-read-only (get-maturity-block) (var-get maturity-block))
(define-read-only (is-mature) (>= block-height (var-get maturity-block)))
(define-read-only (blocks-until-maturity)
  (let ((mat (var-get maturity-block)))
    (if (>= block-height mat) u0 (- mat block-height))))

(define-public (transfer
  (amount uint) (sender principal) (recipient principal)
  (memo (optional (buff 34))))
  (let ((sender-bal (default-to u0 (map-get? balances sender))))
    (asserts! (is-eq tx-sender sender) ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= sender-bal amount) ERR-INSUFFICIENT)
    (map-set balances sender (- sender-bal amount))
    (map-set balances recipient
      (+ (default-to u0 (map-get? balances recipient)) amount))
    (match memo m (begin (print m) true) true)
    (ok true)))

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender VAULT-CONTRACT) ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (map-set balances recipient
      (+ (default-to u0 (map-get? balances recipient)) amount))
    (var-set total-supply (+ (var-get total-supply) amount))
    (ok true)))

(define-public (burn (amount uint) (owner principal))
  (let ((owner-bal (default-to u0 (map-get? balances owner))))
    (asserts! (is-eq tx-sender VAULT-CONTRACT) ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= owner-bal amount) ERR-INSUFFICIENT)
    (map-set balances owner (- owner-bal amount))
    (var-set total-supply (- (var-get total-supply) amount))
    (ok true)))

(define-public (set-maturity-block (target-block uint))
  (begin
    (asserts! (is-eq tx-sender VAULT-CONTRACT) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (var-get maturity-block) u0) ERR-NOT-AUTHORIZED)
    (asserts! (> target-block block-height) ERR-ZERO-AMOUNT)
    (var-set maturity-block target-block)
    (ok true)))
