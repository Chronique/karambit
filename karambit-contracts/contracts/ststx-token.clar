;; ststx-token.clar
;; Mock stSTX token untuk testing di devnet/testnet
;; Di mainnet diganti dengan address StackingDAO yang asli

(impl-trait .kb-sip010.sip-010-trait)

(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-INSUFFICIENT   (err u402))
(define-constant ERR-ZERO-AMOUNT    (err u400))

(define-data-var token-supply uint u0)
(define-map token-balances principal uint)

(define-read-only (get-name) (ok "Stacked STX"))
(define-read-only (get-symbol) (ok "stSTX"))
(define-read-only (get-decimals) (ok u8))
(define-read-only (get-token-uri) (ok none))
(define-read-only (get-total-supply) (ok (var-get token-supply)))

(define-read-only (get-balance (account principal))
  (ok (default-to u0 (map-get? token-balances account))))

(define-public (transfer
  (amount uint)
  (sender principal)
  (recipient principal)
  (memo (optional (buff 34))))
  (let ((sender-bal (default-to u0 (map-get? token-balances sender))))
    (asserts! (is-eq tx-sender sender) ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= sender-bal amount) ERR-INSUFFICIENT)
    (map-set token-balances sender (- sender-bal amount))
    (map-set token-balances recipient
      (+ (default-to u0 (map-get? token-balances recipient)) amount))
    (ok true)))

;; Mint untuk testing - siapapun bisa mint di devnet
(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (map-set token-balances recipient
      (+ (default-to u0 (map-get? token-balances recipient)) amount))
    (var-set token-supply (+ (var-get token-supply) amount))
    (ok true)))
