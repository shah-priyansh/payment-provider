# Payment Provider

A backend service for processing card payments. Handles user accounts, card vault, tokenization, and payment lifecycle with a mock bank integration.

## Stack

- **NestJS** + TypeScript
- **PostgreSQL** via Prisma ORM
- **JWT** (access + refresh tokens)
- **Docker Compose** for local dev

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in values
cp .env.example .env

# Generate CARD_ENCRYPTION_KEY
openssl rand -hex 32

# 3. Start the database
docker compose up db -d

# 4. Run migrations
npm run db:migrate

# 5. Start the server
npm run start:dev
```

Swagger UI available at `http://localhost:3000/api`.

## Running with Docker

```bash
docker compose up --build
```

This starts the app on port 3000 and a PostgreSQL instance on port 5432.

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_TEST_URL` | Test database (port 5433) |
| `JWT_SECRET` | Access token signing key |
| `JWT_REFRESH_SECRET` | Refresh token signing key |
| `CARD_ENCRYPTION_KEY` | 64-char hex key for AES-256-GCM card encryption |
| `PORT` | Server port (default 3000) |

## API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create account, returns tokens |
| POST | `/auth/login` | Login, returns tokens |
| POST | `/auth/refresh` | Rotate refresh token |
| POST | `/auth/logout` | Revoke refresh token |

### Cards
| Method | Path | Description |
|---|---|---|
| POST | `/cards` | Add a card (Luhn validated, PAN encrypted) |
| GET | `/cards` | List your cards |
| DELETE | `/cards/:id` | Remove a card |
| POST | `/cards/:id/tokenize` | Get a single-use payment token |

### Payments
| Method | Path | Description |
|---|---|---|
| POST | `/payments` | Submit payment (requires `idempotency-key` header) |
| GET | `/payments/:id` | Get transaction status and history |

### Metrics
| Method | Path | Description |
|---|---|---|
| GET | `/metrics` | Transaction counts, success rate, avg response time |

## Tests

```bash
# Unit tests
npm run test

# Integration tests (requires db_test container running)
docker compose up db_test -d
npm run test:integration
```

Unit tests cover: Luhn validation, card encryption, token service, mock bank, state machine, retry logic.

Integration tests cover: auth flows, card management, payment lifecycle, idempotency, retry exhaustion, access control.

## Key Design Decisions

**Card storage** — PAN is encrypted with AES-256-GCM (unique IV per card). CVV is never stored. Last four digits and a SHA-256 hash of the PAN are stored in plaintext for display and duplicate detection.

**Tokenization** — Tokens are 32 random bytes encoded as hex (64 chars). Each token expires after 1 hour and is single-use-friendly (can be invalidated).

**Payments** — Payment processing is asynchronous. `POST /payments` returns immediately with the transaction in `INITIATED` state. The bank call happens in the background. Poll `GET /payments/:id` for the final status.

**Idempotency** — `POST /payments` requires an `idempotency-key` header. Duplicate keys return the original transaction instead of creating a new one.

**Retry** — Network errors and rate limits trigger exponential backoff with jitter: `min(1000 * 2^attempt, 30000) + random(0, 500)ms`. Max 3 retries. Insufficient funds and invalid card errors fail immediately (no retry).

**Rate limiting** — Global: 100 requests/min. Payments endpoint: 20 requests/min.

**Observability** — Every request gets a `X-Correlation-ID` header (generated if not provided). All logs are structured JSON with correlation ID, user ID, duration, and endpoint.
