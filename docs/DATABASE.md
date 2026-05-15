# Database Design

PostgreSQL 16. All primary keys are UUIDs. Timestamps are stored in UTC.

## Tables

### users
Stores registered accounts.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| email | varchar UNIQUE | |
| password_hash | varchar | bcrypt, cost 12 |
| created_at | timestamp | |

---

### refresh_tokens
Refresh token store. Tokens are hashed before storage — the raw token is only ever returned to the client at issue time.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | indexed |
| token_hash | varchar | bcrypt hash of the raw token |
| expires_at | timestamp | 7 days from issue |
| revoked | boolean | set true on use or logout |

---

### cards
Card vault. Raw PAN is never stored. PAN and expiry are encrypted at rest using AES-256-GCM. CVV is never stored at any point.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | indexed |
| last_four | varchar(4) | for display only |
| card_hash | varchar UNIQUE | SHA-256 of PAN, used to detect duplicates |
| encrypted_pan | text | AES-256-GCM: `base64(iv):base64(authTag):base64(ciphertext)` |
| encrypted_expiry | text | same format |
| cardholder_name | varchar | |
| is_active | boolean | soft delete |
| created_at | timestamp | |

---

### card_tokens
Short-lived payment tokens. A token is issued per tokenize request and maps back to a card. Used in place of the raw card number when submitting payments.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| card_id | uuid FK → cards | indexed |
| user_id | uuid FK → users | indexed, for ownership checks without joining cards |
| token | varchar UNIQUE | 64 hex chars (32 random bytes) |
| expires_at | timestamp | 1 hour from issue |
| is_active | boolean | |
| created_at | timestamp | |

---

### transactions
One row per payment attempt. Status transitions are enforced by the application state machine.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | indexed |
| card_token_id | uuid FK → card_tokens | indexed |
| amount | decimal(12,2) | |
| currency | varchar(3) | ISO 4217, e.g. USD |
| status | enum | see status flow below |
| idempotency_key | varchar UNIQUE | client-supplied, prevents duplicate submissions |
| auth_code | varchar nullable | set on successful authorization |
| error_code | varchar nullable | set on failure |
| retry_count | int | increments on each retry attempt |
| created_at | timestamp | |
| updated_at | timestamp | auto-updated |

**Status flow:**
```
INITIATED → PROCESSING → AUTHORIZED → CAPTURED
                      ↘ FAILED
                      ↘ RETRYING → PROCESSING (loop, max 3 retries)
                                 ↘ FAILED
```

---

### transaction_state_history
Audit trail. Every time a transaction's status changes, a row is inserted here.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| transaction_id | uuid FK → transactions | indexed |
| from_status | enum | previous status |
| to_status | enum | new status |
| reason | text nullable | error code or description |
| created_at | timestamp | |

---

## Relationships

```
users ──< refresh_tokens
users ──< cards ──< card_tokens ──< transactions ──< transaction_state_history
users ──< card_tokens
users ──< transactions
```

## Indexes

Beyond primary keys and unique constraints:

| Table | Index | Reason |
|---|---|---|
| refresh_tokens | user_id | lookup all tokens for a user on logout |
| cards | user_id | list cards for a user |
| card_tokens | card_id, user_id | ownership check on tokenize/validate |
| transactions | user_id, card_token_id, status | user payment history, status filtering |
| transaction_state_history | transaction_id | fetch history for a transaction |

## Notes

- `card_hash` is a SHA-256 of the raw PAN. It lets us detect if the same card is added twice without decrypting.
- The `idempotency_key` unique constraint on `transactions` is the database-level guarantee against duplicate payments. The application also checks before inserting, but a unique constraint handles race conditions at the DB level.
- `user_id` is denormalized onto `card_tokens` to avoid a join when validating token ownership during payment submission.
