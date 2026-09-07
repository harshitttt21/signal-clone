# Signal Clone — SDE Fullstack Assignment

A functional clone of Signal: mocked phone/OTP auth, contacts, real-time 1:1 and
group messaging over WebSockets, typing indicators, delivery/read receipts, and a
UI modeled closely on Signal's actual layout and interaction patterns.

> **Built in an environment with no internet access**, so the code was hand-written
> and reviewed carefully (Python files pass `py_compile`) but **not live-tested**.
> Run the steps below in order the first time — if anything doesn't line up, it's
> most likely a dependency-version mismatch on your machine, easy to fix by
> checking the error against `requirements.txt` / `package.json`.

## Tech stack

- **Frontend:** Next.js 14 (App Router, TypeScript), Tailwind CSS, native WebSocket API
- **Backend:** FastAPI, SQLAlchemy ORM, native FastAPI WebSockets
- **Database:** SQLite
- **Auth:** Mocked OTP flow + JWT bearer tokens

## Project structure

```
signal-clone/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, router registration
│   │   ├── models.py          # SQLAlchemy models (the DB schema)
│   │   ├── schemas.py         # Pydantic request/response models
│   │   ├── database.py        # SQLite engine/session setup
│   │   ├── auth.py            # JWT issuing/verification, mock OTP constant
│   │   ├── ws_manager.py      # In-memory WebSocket connection manager
│   │   ├── seed.py            # Demo data seeder
│   │   └── routers/
│   │       ├── auth.py            # /auth/* — register, login, me
│   │       ├── contacts.py        # /contacts/* — search, add, list
│   │       ├── conversations.py   # /conversations/* — list/create/messages/members
│   │       └── ws.py              # /ws — the real-time message/typing/receipt/presence socket
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── login/page.tsx     # Phone/username + mock OTP flow
    │   ├── chat/page.tsx      # Main app: owns conversations/messages state + socket wiring
    │   └── page.tsx           # Redirects to /login or /chat
    ├── components/            # ConversationList, ChatPane, MessageBubble, modals, Avatar
    ├── contexts/AuthContext.tsx
    └── lib/
        ├── api.ts             # REST client
        └── socket.ts          # WebSocket singleton with a pub/sub event bus
```

## Setup instructions

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # on Windows: venv\Scripts\activate
pip install -r requirements.txt

# seed the database with demo users, contacts, conversations, and messages
python -m app.seed

# run the server
uvicorn app.main:app --reload --port 8000
```

The API is now at `http://localhost:8000` (interactive docs at `/docs`).
This creates `backend/signal_clone.db` (SQLite file) — delete it and re-run
`python -m app.seed` any time to reset demo data.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.local.example .env.local     # defaults already point at localhost:8000
npm run dev
```

Open `http://localhost:3000`.

### 3. Log in

Demo accounts (all use the fixed mock OTP **`123456`**):

| Username | Display name |
|----------|--------------|
| harshit  | Harshit      |
| vrinda   | Vrinda       |
| rhythm   | Rhythm       |
| garvit   | Garvit       |
| vanshika | Vanshika     |

To see real-time messaging, log in as two different users in two browser
windows (or one normal + one incognito window), e.g. `harshit` in one and
`vrinda` in the other — they already share a conversation from the seed data.

You can also register a brand-new account: enter any username/phone on the
login screen, use OTP `123456`, then set a display name.

## Architecture overview

- **REST (FastAPI)** handles everything that isn't inherently real-time:
  auth, contact search/add, conversation/group creation, and fetching message
  history when a conversation is opened.
- **WebSockets** handle everything that needs to be pushed live: new messages,
  typing indicators, delivery/read receipt updates, and online/offline
  presence. A single `/ws?token=<JWT>` connection per client carries all of
  these as typed JSON frames (`message:send`, `typing`, `receipt` from the
  client; `message:new`, `typing`, `receipt:update`, `presence` from the
  server).
- **Connection manager** (`ws_manager.py`) is an in-memory `user_id -> [WebSocket]`
  map. This is intentionally simple for a single-process demo; a production
  version would move this to Redis pub/sub to support multiple backend
  instances.
- **Frontend state**: `app/chat/page.tsx` is the single owner of conversations
  and message state. It subscribes to the socket's event bus once and fans
  updates out to `ConversationList` and `ChatPane`. Sending a message is
  optimistic — a temporary `sending` message is shown immediately and swapped
  for the server-confirmed message via a `client_temp_id` correlation.

## Database schema

```
users
├─ id (PK)
├─ phone_or_username (unique)
├─ display_name
├─ avatar_url
├─ is_online, last_seen
└─ created_at

conversations
├─ id (PK)
├─ is_group (bool)
├─ name              -- only meaningful when is_group = true
├─ avatar_url
└─ created_at

conversation_members            -- junction table; models 1:1 AND group chats uniformly
├─ id (PK)
├─ conversation_id (FK -> conversations.id)
├─ user_id (FK -> users.id)
├─ role               -- admin | member
├─ last_read_message_id   -- powers the unread-count calculation
└─ joined_at
   (unique on conversation_id + user_id)

messages
├─ id (PK)
├─ conversation_id (FK -> conversations.id)
├─ sender_id (FK -> users.id)
├─ body
└─ created_at

message_receipts                -- per-recipient delivery/read status
├─ id (PK)
├─ message_id (FK -> messages.id)
├─ user_id (FK -> users.id)      -- the recipient this receipt belongs to
├─ status             -- delivered | read
└─ timestamp
   (unique on message_id + user_id)

contacts                        -- explicit contact list, separate from membership
├─ id (PK)
├─ owner_id (FK -> users.id)
├─ contact_id (FK -> users.id)
└─ created_at
   (unique on owner_id + contact_id)
```

**Key design decision:** a 1:1 chat is just a `conversation` with `is_group =
false` and exactly two rows in `conversation_members`. There's no separate
"direct message" table — the same `messages`/`message_receipts` machinery and
the same REST/WS code paths serve both 1:1 and group chats, which keeps the
backend logic and message-status derivation (single vs. double checkmarks)
uniform.

**Message status** (`sent` / `delivered` / `read`) is derived, not stored, on
each read: it looks at the `message_receipts` rows for every other member of
the conversation and takes the minimum status across them. This scales the
same for a 1:1 chat and a 10-person group.

## API overview

| Method | Path                                  | Purpose |
|--------|----------------------------------------|---------|
| POST   | `/auth/request-otp`                    | Mock: returns the fixed OTP |
| POST   | `/auth/register`                       | Create account after OTP check, returns JWT |
| POST   | `/auth/login`                          | Log in with existing account + OTP, returns JWT |
| GET    | `/auth/me`                             | Current user from bearer token |
| GET    | `/contacts`                            | List your contacts |
| GET    | `/contacts/search?q=`                  | Search all users by name/username |
| POST   | `/contacts`                            | Add a contact by username |
| GET    | `/conversations`                       | List your conversations, sorted by last activity |
| POST   | `/conversations/direct`                | Get-or-create a 1:1 conversation with a contact |
| POST   | `/conversations/group`                 | Create a group conversation |
| GET    | `/conversations/{id}/messages`         | Full message history for a conversation |
| POST   | `/conversations/{id}/members`          | Admin: add a group member |
| DELETE | `/conversations/{id}/members/{userId}` | Admin: remove a member (or leave, for yourself) |
| WS     | `/ws?token=<JWT>`                      | Real-time send/receive, typing, receipts, presence |

### WebSocket message shapes

Client → server:
```json
{"type": "message:send", "conversation_id": "...", "body": "hi", "client_temp_id": "temp-123"}
{"type": "typing", "conversation_id": "...", "is_typing": true}
{"type": "receipt", "message_id": "...", "status": "read"}
```

Server → client:
```json
{"type": "message:new", "conversation_id": "...", "message": {...}, "client_temp_id": "temp-123"}
{"type": "typing", "conversation_id": "...", "user_id": "...", "is_typing": true}
{"type": "receipt:update", "message_id": "...", "conversation_id": "...", "user_id": "...", "status": "delivered"}
{"type": "presence", "user_id": "...", "is_online": true}
```

## Assumptions & mocked pieces (per the assignment brief)

- Phone verification is mocked: the OTP is always `123456`, no SMS is sent.
- End-to-end encryption is not implemented — messages are stored in plaintext
  in SQLite, as the brief explicitly allows.
- Voice/video calls, Stories, and linked devices are "Coming soon" placeholders.
- Online/last-seen status is real (driven by actual WebSocket connections),
  not simulated with random data.
- JWTs are long-lived (7 days) since this is a demo, not a production auth setup.

## Bonus features implemented

- Dark-mode-ready color tokens are centralized in `tailwind.config.ts`
  (not wired to a toggle yet — noted here as the natural next step)
- Fully responsive core layout primitives (flex-based, no fixed page height issues)

## Deployment

- **Frontend:** deploy to Vercel, set `NEXT_PUBLIC_API_URL` and
  `NEXT_PUBLIC_WS_URL` (use `wss://` in production) to your backend's public URL.
- **Backend:** deploy to Render/Railway. SQLite is file-based, so use a
  persistent disk/volume, or swap `DATABASE_URL` in `database.py` for a
  managed Postgres URL for production use.
