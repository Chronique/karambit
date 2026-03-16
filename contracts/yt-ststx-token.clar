;; yt-ststx-token.clar
;; Yield Token (YT) — SIP-010 Fungible Token
;;
;; Representasi hak atas SEMUA yield yang dihasilkan selama periode.
;; Holder YT menerima seluruh yield (staking rewards dari StackingDAO).
;; Value YT → 0 saat maturity karena semua yield sudah ter-claim.
;;
;; Ini yang membuat YT menarik untuk diperdagangkan:
;;   - Bullish APY? → Beli YT untuk dapat lebih banyak yield
;;   - Bearish APY? → Jual YT, lock profit via PT

;; ============================================================
;; SIP-010 Trait
;; ============================================================

(impl-trait .sip-010-trait.sip-010-trait)

;; ============================================================
;; Constants
;; ============================================================

(define-constant CONTRACT-OWNER tx-sender)
(define-constant VAULT-CONTRACT .vault)

(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-ZERO-AMOUNT    (err u400))
(define-constant ERR-INSUFFICIENT   (err u402))
(define-constant ERR-MATURED        (err u410)) ;; YT sudah tidak bisa di-claim setelah lama

(define-constant TOKEN-NAME "YT-stSTX-DEC2025")
(define-constant TOKEN-SYMBOL "YT-stSTX")
(define-constant TOKEN-DECIMALS u8)
(define-constant TOKEN-URI (some u"https://karambit.app/tokens/yt-ststx-dec2025.json"))

;; ============================================================
;; Storage
;; ============================================================

(define-data-var total-supply uint u0)
(define-data-var maturity-block uint u0)

(define-map balances principal uint)

;; Yield index: akumulasi yield per unit YT (scaled by PRECISION)
;; Naik setiap kali ada yield baru masuk ke vault
(define-data-var yield-index uint u100000000) ;; mulai dari 1.0 (8 desimal)

;; Yield index snapshot per user saat terakhir claim
;; Digunakan untuk hitung yield yang belum di-claim
(define-map user-yield-index principal uint)

;; Akumulasi yield yang belum di-claim per user (dalam stSTX)
(define-map pending-yield principal uint)

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

(define-read-only (get-yield-index) (var-get yield-index))
(define-read-only (get-maturity-block) (var-get maturity-block))
(define-read-only (is-mature) (>= block-height (var-get maturity-block)))

;; Hitung pending yield untuk user
(define-read-only (get-pending-yield (account principal))
  (let (
    (user-yt-bal (default-to u0 (map-get? balances account)))
    (current-index (var-get yield-index))
    (user-index (default-to (var-get yield-index) (map-get? user-yield-index account)))
    (already-pending (default-to u0 (map-get? pending-yield account)))
  )
    (if (is-eq user-yt-bal u0)
      already-pending
      (let ((new-yield
        (/ (* user-yt-bal (- current-index user-index)) u100000000)))
        (+ already-pending new-yield)
      )
    )
  )
)

;; ============================================================
;; Internal: update pending yield sebelum transfer/mint/burn
;; ============================================================

(define-private (checkpoint (account principal))
  (let (
    (pending (get-pending-yield account))
    (current-index (var-get yield-index))
  )
    (map-set pending-yield account pending)
    (map-set user-yield-index account current-index)
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

    ;; Checkpoint yield untuk kedua pihak sebelum transfer
    (checkpoint sender)
    (checkpoint recipient)

    (map-set balances sender (- sender-bal amount))
    (map-set balances recipient
      (+ (default-to u0 (map-get? balances recipient)) amount))

    (match memo m (print m) true)
    (ok true)
  )
)

;; ============================================================
;; Claim Yield — siapapun pemegang YT bisa claim yield
;; ============================================================

(define-public (claim-yield (recipient principal))
  (let (
    (caller tx-sender)
    (claimable (get-pending-yield caller))
  )
    (asserts! (> claimable u0) ERR-ZERO-AMOUNT)

    ;; Reset pending yield
    (map-set pending-yield caller u0)
    (map-set user-yield-index caller (var-get yield-index))

    ;; Vault yang transfer stSTX yield ke user
    (try! (contract-call? .vault distribute-yield caller claimable))

    (ok claimable)
  )
)

;; ============================================================
;; Mint & Burn — hanya vault
;; ============================================================

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender VAULT-CONTRACT) ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)

    (checkpoint recipient)

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

    (checkpoint owner)

    (map-set balances owner (- owner-bal amount))
    (var-set total-supply (- (var-get total-supply) amount))

    (ok true)
  )
)

;; ============================================================
;; Admin: update yield index (dipanggil vault saat ada yield baru)
;; ============================================================

(define-public (update-yield-index (new-index uint))
  (begin
    (asserts! (is-eq tx-sender VAULT-CONTRACT) ERR-NOT-AUTHORIZED)
    (asserts! (>= new-index (var-get yield-index)) ERR-ZERO-AMOUNT)
    (var-set yield-index new-index)
    (ok true)
  )
)

(define-public (set-maturity-block (target-block uint))
  (begin
    (asserts! (is-eq tx-sender VAULT-CONTRACT) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq (var-get maturity-block) u0) ERR-NOT-AUTHORIZED)
    (var-set maturity-block target-block)
    (ok true)
  )
)
