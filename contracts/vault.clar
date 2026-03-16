;; vault.clar
;; Core Vault Contract — jantung dari yield tokenization protocol
;;
;; Alur utama:
;;   1. User deposit sySTX → vault mint PT + YT (1:1 per unit)
;;   2. Setelah maturity → PT holder redeem untuk dapat underlying
;;   3. YT holder claim yield kapanpun sebelum/saat maturity
;;   4. Setelah maturity, sisa yield di-distribute ke YT holder

;; ============================================================
;; Constants & Errors
;; ============================================================

(define-constant CONTRACT-OWNER tx-sender)
(define-constant PRECISION u100000000) ;; 8 decimals

(define-constant ERR-NOT-AUTHORIZED  (err u401))
(define-constant ERR-ZERO-AMOUNT     (err u400))
(define-constant ERR-INSUFFICIENT    (err u402))
(define-constant ERR-NOT-MATURE      (err u411))
(define-constant ERR-ALREADY-MATURE  (err u412))
(define-constant ERR-PAUSED          (err u503))

;; ============================================================
;; Storage
;; ============================================================

;; Maturity configuration
(define-data-var maturity-block uint u0)
(define-data-var is-initialized bool false)
(define-data-var is-paused bool false)

;; Total sySTX yang di-lock di vault ini
(define-data-var total-locked-sy uint u0)

;; Total stSTX yield yang sudah dikumpulkan (buat distribusi ke YT)
(define-data-var total-yield-collected uint u0)

;; ============================================================
;; Read-only
;; ============================================================

(define-read-only (get-maturity-block) (var-get maturity-block))
(define-read-only (get-total-locked) (var-get total-locked-sy))
(define-read-only (get-total-yield) (var-get total-yield-collected))
(define-read-only (get-initialized) (var-get is-initialized))

(define-read-only (is-mature)
  (and (var-get is-initialized)
       (>= block-height (var-get maturity-block)))
)

(define-read-only (blocks-until-maturity)
  (let ((mat (var-get maturity-block)))
    (if (>= block-height mat) u0 (- mat block-height))
  )
)

;; Estimasi APY berdasarkan yield yang sudah terkumpul
;; Formula sederhana: (yield / locked) / (elapsed_blocks / blocks_per_year) * 100
(define-read-only (get-implied-apy)
  (let (
    (locked (var-get total-locked-sy))
    (yield (var-get total-yield-collected))
    (mat (var-get maturity-block))
    (elapsed (if (> block-height u0) block-height u1))
    (blocks-per-year u52560) ;; ~365 hari * 144 block/hari
  )
    (if (or (is-eq locked u0) (is-eq elapsed u0))
      u0
      (/ (* (/ (* yield PRECISION) locked) blocks-per-year) elapsed)
    )
  )
)

;; ============================================================
;; Initialize — setup maturity, hanya bisa sekali
;; ============================================================

(define-public (initialize (target-maturity-block uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (not (var-get is-initialized)) ERR-NOT-AUTHORIZED)
    (asserts! (> target-maturity-block block-height) ERR-ZERO-AMOUNT)

    (var-set maturity-block target-maturity-block)
    (var-set is-initialized true)

    ;; Set maturity di PT dan YT contracts
    (try! (contract-call? .pt-ststx-token set-maturity-block target-maturity-block))
    (try! (contract-call? .yt-ststx-token set-maturity-block target-maturity-block))

    (ok true)
  )
)

;; ============================================================
;; MINT: Deposit sySTX → dapat PT + YT
;; ============================================================

(define-public (mint-pt-yt (sy-amount uint))
  (let ((caller tx-sender))
    (asserts! (var-get is-initialized) ERR-NOT-AUTHORIZED)
    (asserts! (not (var-get is-paused)) ERR-PAUSED)
    (asserts! (not (is-mature)) ERR-ALREADY-MATURE)
    (asserts! (> sy-amount u0) ERR-ZERO-AMOUNT)

    ;; Transfer sySTX dari user ke vault
    (try! (contract-call? .sy-ststx-wrapper transfer
      sy-amount caller (as-contract tx-sender)))

    ;; Mint PT ke user (1:1 dengan sy amount)
    (try! (contract-call? .pt-ststx-token mint sy-amount caller))

    ;; Mint YT ke user (1:1 dengan sy amount)
    (try! (contract-call? .yt-ststx-token mint sy-amount caller))

    ;; Update total locked
    (var-set total-locked-sy (+ (var-get total-locked-sy) sy-amount))

    (print {
      event: "mint-pt-yt",
      user: caller,
      sy-amount: sy-amount,
      pt-amount: sy-amount,
      yt-amount: sy-amount
    })

    (ok { pt: sy-amount, yt: sy-amount })
  )
)

;; ============================================================
;; REDEEM PT: Setelah maturity, tukar PT → underlying (sySTX)
;; ============================================================

(define-public (redeem-pt (pt-amount uint))
  (let ((caller tx-sender))
    (asserts! (is-mature) ERR-NOT-MATURE)
    (asserts! (> pt-amount u0) ERR-ZERO-AMOUNT)

    ;; Burn PT dari user
    (try! (contract-call? .pt-ststx-token burn pt-amount caller))

    ;; Transfer sySTX ke user (1:1)
    (try! (as-contract (contract-call? .sy-ststx-wrapper transfer
      pt-amount tx-sender caller)))

    ;; Lalu user bisa redeem sySTX → stSTX via sy-wrapper

    (print {
      event: "redeem-pt",
      user: caller,
      pt-amount: pt-amount,
      sy-amount: pt-amount
    })

    (ok pt-amount)
  )
)

;; ============================================================
;; REDEEM sebelum maturity: kembalikan PT + YT → dapat sySTX
;; (Early exit — harus kembalikan kedua token, jumlah sama)
;; ============================================================

(define-public (redeem-early (amount uint))
  (let ((caller tx-sender))
    (asserts! (not (is-mature)) ERR-ALREADY-MATURE)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)

    ;; Burn PT dan YT dalam jumlah sama
    (try! (contract-call? .pt-ststx-token burn amount caller))
    (try! (contract-call? .yt-ststx-token burn amount caller))

    ;; Kembalikan sySTX ke user
    (try! (as-contract (contract-call? .sy-ststx-wrapper transfer
      amount tx-sender caller)))

    (var-set total-locked-sy (- (var-get total-locked-sy) amount))

    (print {
      event: "redeem-early",
      user: caller,
      amount: amount
    })

    (ok amount)
  )
)

;; ============================================================
;; DISTRIBUTE YIELD: dipanggil oleh YT contract saat user claim
;; ============================================================

(define-public (distribute-yield (recipient principal) (amount uint))
  (begin
    (asserts! (is-eq tx-sender .yt-ststx-token) ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)

    ;; Transfer stSTX yield ke user
    ;; Yield sudah dikumpulkan di vault ini dari sync-yield calls
    (try! (as-contract (contract-call? .ststx-token transfer
      amount tx-sender recipient none)))

    (ok true)
  )
)

;; ============================================================
;; COLLECT YIELD: Admin kumpulkan yield dari StackingDAO, update index
;; Dipanggil secara periodik (bisa dibikin automated)
;; ============================================================

(define-public (collect-and-distribute-yield (new-yield-amount uint))
  (let (
    (total-yt (unwrap-panic (contract-call? .yt-ststx-token get-total-supply)))
    (current-index (contract-call? .yt-ststx-token get-yield-index))
  )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (> new-yield-amount u0) ERR-ZERO-AMOUNT)
    (asserts! (> total-yt u0) ERR-ZERO-AMOUNT)

    ;; Update total yield collected
    (var-set total-yield-collected
      (+ (var-get total-yield-collected) new-yield-amount))

    ;; Hitung new yield index: index += (yield / total_yt) * PRECISION
    (let ((index-delta (/ (* new-yield-amount PRECISION) total-yt)))
      (try! (contract-call? .yt-ststx-token update-yield-index
        (+ current-index index-delta)))
    )

    (ok true)
  )
)

;; ============================================================
;; Admin utilities
;; ============================================================

(define-public (set-paused (paused bool))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (var-set is-paused paused)
    (ok true)
  )
)
