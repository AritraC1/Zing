# Zing: PRD

## 1. Purpose and scope

This document describes the target architecture for Zing, extending today's 1:1 chat app into a full communication platform with:

- 1:1 chat, audio and video
- Group chat, audio and video
- End-to-end encryption (E2EE) for messages, media and calls, modelled on WhatsApp's approach (the Signal protocol)
- Group calls built on an SFU (Selective Forwarding Unit) for efficiency

Out of scope for this version: stories or status, channels, bots, payments, and server-side search.

## 2. Current state (from the repository)

| Area | Today | Gap to target |
| --- | --- | --- |
| Client | React 19, Vite, Tailwind 4, Redux Toolkit and Persist, Socket.IO client | Needs a crypto layer (Web Worker), IndexedDB message store, call UI for groups |
| Backend | Express 5 and Socket.IO. Modules: auth, chat, messages, media, users, devices, sessions, calls | Realtime layer is single-node; no group concept |
| Auth | Firebase phone OTP, then server-issued JWT access and refresh cookies; refresh tokens stored hashed in DB sessions | Good base. Phone identity maps well to a WhatsApp-style model |
| Database | PostgreSQL with tracked migrations | Add key tables, envelope queue, groups |
| Messaging | 1:1 over Socket.IO, delivery and read state, clientMsgId idempotency, paginated history | Messages are plaintext on the server; history lives server-side |
| Media | Multer and Cloudinary | Plaintext uploads; Cloudinary transformations cannot work on encrypted blobs |
| Calls | 1:1 WebRTC peer-to-peer, STUN only, Socket.IO signaling, calls table | No TURN fallback, SDP not authenticated, no group calls |
| Redis | Mentioned in setup notes, unused in code | Required for scaling and presence |
| Deployment | Only the frontend is deployed (Vercel); backend is local or Docker Compose; CI builds and tests | Backend, TURN and SFU need hosting |

Three architectural shifts follow from this analysis:

1. **The server becomes a ciphertext relay.** It can no longer read, search or render message bodies.
2. **Media storage changes.** Encrypted blobs go to plain object storage, not an image-transforming CDN.
3. **Realtime must scale horizontally.** Redis-backed pub/sub, presence and rate limiting are needed once there are multiple Node instances and SFU nodes.

The existing `devices` module, clientMsgId idempotency and hashed-session model are good foundations and should be kept.

## 3. Requirements

### 3.1 Functional

- Phone-number registration and login (existing)
- 1:1 and group text chat with delivery and read receipts, replies, and media attachments
- Group management: create, rename, add and remove members, admin roles, leave
- 1:1 audio and video calls with ringing, accept, reject, missed-call records
- Group audio and video calls: start, join, leave, mute, camera toggle, screen share (later)
- Offline delivery: messages and call invites reach a device that was offline, via push and queue
- Multi-device support (phased; see Section 5.7)

### 3.2 Non-functional (targets to confirm)

| Attribute | Target |
| --- | --- |
| Message delivery latency | p95 under 300 ms between online users in the same region |
| Call setup time | Under 3 s to first media on a typical network |
| Group call size | 8 video participants as the design point; up to 32 audio-only (assumption, tune after load testing) |
| Confidentiality | Server never has access to plaintext or private keys of messages, media or call media |
| Availability | Stateless API and gateway nodes; any node can fail without losing queued messages |
| Privacy | Minimal metadata retention; content-free push notifications |

## 4. High-level architecture

The system has three planes: a **control plane** (REST), a **message plane** (Socket.IO and the envelope queue) and a **media plane** (WebRTC through TURN or an SFU).

```
Clients (Web/PWA now, mobile later)
  |  HTTPS REST        |  WSS Socket.IO          |  WebRTC (UDP/TCP/TLS)
  v                    v                         v
API service      Realtime gateway          TURN (coturn)   SFU cluster
  |                    |                         |             |
  +------ Redis (pub/sub, presence, rate limits, SFU room map) --+
  |
  +-- PostgreSQL (accounts, devices, key bundles, envelopes, groups, calls)
  +-- Object storage (encrypted attachment blobs)
  +-- Push (FCM and Web Push) for offline wake-ups
```

### 4.1 Components

| Component | Responsibility | Notes |
| --- | --- | --- |
| Web client | UI, all cryptography, local encrypted message store, WebRTC | Crypto runs in a Web Worker; keys never leave the device |
| API service | Auth, prekey bundle upload and fetch, group membership, upload URLs, call tokens, ICE credentials | Extends the existing Express modules |
| Realtime gateway | Socket.IO connections, envelope routing, receipts, call signaling, presence | Stateless; Redis adapter for multi-node |
| Envelope queue | Holds ciphertext until each recipient device acknowledges it | Postgres table with TTL; delete on ack |
| Key service | Stores public keys only: identity, signed prekeys, one-time prekeys | Part of the API service |
| Media service | Issues presigned upload and download URLs for encrypted blobs | Replaces Cloudinary for chat media |
| TURN | NAT traversal and relay for 1:1 calls | coturn with time-limited credentials; TLS on 443 for restrictive networks |
| SFU cluster | Forwards group call media | mediasoup or LiveKit (Section 7.3) |
| Push | Wakes offline devices | FCM and Web Push; payload carries no message content |
| Redis | Socket.IO adapter, presence with TTL, rate limiting, room-to-node mapping | Already planned in the README |

## 5. End-to-end encryption design

### 5.1 Principles

- Private keys are generated on the device and never uploaded.
- The server stores and routes only ciphertext plus the minimum routing metadata.
- One mechanism covers all content types: messages, media keys, and call keys travel inside E2EE envelopes.
- Public keys come from the server, so users must be able to verify identity keys out of band (Section 5.9).

### 5.2 Protocol

Use the **Signal protocol**, which is what WhatsApp uses: an X3DH-style asynchronous handshake (or its post-quantum successor PQXDH) followed by the **Double Ratchet** for forward secrecy and post-compromise security. The README notes this is already in progress. Before committing to a library, verify it runs well in the browser (WASM or a maintained JS build); official libsignal bindings are Node and native focused, so a Rust-to-WASM build may be required. Never implement the cryptographic primitives yourself.

### 5.3 Key inventory

| Key | Scope | Lifetime | Stored |
| --- | --- | --- | --- |
| Identity key pair | Per device | Long-term | Private on device; public on server |
| Signed prekey | Per device | Rotated periodically (for example weekly) | Private on device; public and signature on server |
| One-time prekeys | Per device | Single use; batches of around 100, replenished when low | Private on device; public on server |
| Session keys (Double Ratchet) | Per pair of devices | Ratchet each message | Device only |
| Sender key | Per member per group | Rotated on membership removal | Device only; distributed over pairwise sessions |
| Attachment key | Per file | Single use | Inside the E2EE message |
| Call key | Per call (group) | Rotated on join or leave | Device only; distributed over pairwise sessions |

### 5.4 Registration and key upload

1. User verifies the phone number through Firebase OTP (existing flow).
2. The client generates the identity key pair, a registration ID, a signed prekey and a batch of one-time prekeys.
3. The client uploads the public parts to the key service, bound to the new device record.
4. The server tells the client when one-time prekeys run low so it can replenish them.

### 5.5 1:1 message flow

1. Alice's client fetches Bob's device list and a prekey bundle per device (if no session exists).
2. She establishes a session locally, encrypts the plaintext once per Bob device (and once per her other devices), and sends envelopes with a clientMsgId.
3. The gateway validates the sender, persists each envelope, acks acceptance to Alice, and pushes it to Bob's connected devices (or sends a content-free push).
4. Bob's device decrypts, stores the plaintext in its local database, and acks. The server deletes that envelope.
5. Delivered and read receipts are themselves small E2EE messages or minimal server events, both idempotent.

### 5.6 Group chat encryption (Sender Keys)

Pairwise encryption to every member for every message does not scale, so groups use **Sender Keys**, as WhatsApp does:

- Each member creates a sender key chain for the group and distributes it to every other member over the existing pairwise Signal sessions.
- A group message is encrypted **once** with the sender's chain; the server fans the same ciphertext out to all member devices.
- **On member removal (or leave), every remaining member rotates their sender key**, so the removed member cannot read future messages. On member add, existing members send their current sender key to the new member (no history is shared by default).
- The server holds the authoritative member list and a membership version, and rejects envelopes from non-members. Clients must also verify membership changes (signed admin actions) so a malicious server cannot silently add a member; this is a known hard problem, so start with admin-signed changes and revisit.

### 5.7 Multi-device

Each device has its own identity and sessions, and senders encrypt per recipient device. Phase 1 should support **one primary device plus linked web sessions treated as separate devices**. Linking a device requires a QR-based flow where the primary approves the new device's identity key. Full multi-device history sync is a later phase.

### 5.8 Attachments

1. Client generates a random 256-bit key, encrypts the file with an AEAD cipher (for example AES-256-GCM or AES-CBC with HMAC), and computes a hash of the ciphertext.
2. Client requests a presigned upload URL and uploads the ciphertext blob.
3. The attachment key, blob ID, hash, MIME type and size go inside the E2EE message.
4. Recipients download the blob, verify the hash, and decrypt.
5. Thumbnails and previews are generated on the client. Cloudinary transformations no longer apply, so move to S3-compatible storage (S3, R2, or MinIO for local dev) with expiring objects.

### 5.9 Identity verification

Provide a safety number or QR comparison screen per chat, and show a warning when a contact's identity key changes. Without this, users trust the server to hand out the right keys.

### 5.10 Local storage and backup

- Message history moves to **IndexedDB on the device**, which becomes the source of truth. Server-side pagination of history (current behaviour) is replaced by local pagination.
- Wrap stored private keys with a non-extractable WebCrypto key where possible, and encrypt the local DB at rest.
- Optional later: user-held-key encrypted backup (passphrase-derived key), never server-readable.
- **Web-client caveat:** the server delivers the JavaScript that does the encryption, so a compromised server could ship a malicious client. Mitigate with strict CSP, subresource integrity, signed releases, and eventually native or desktop clients.

### 5.11 What the server still knows

Phone numbers, who messages whom and when, group membership, message sizes, IP addresses, and call timing. Reduce this over time with content-free push, short retention, and optionally sealed-sender style delivery.

## 6. Messaging service

### 6.1 Envelope model

The server stores one **envelope** per recipient device: routing fields plus an opaque ciphertext blob. Fields: envelope ID, client message ID, chat ID, sender device, recipient device, envelope type (session setup, normal, or group sender-key message), ciphertext, created time, expiry.

### 6.2 Delivery guarantees

- **At-least-once delivery, exactly-once effect.** Clients dedupe on clientMsgId (the existing idempotency design carries over).
- **Ack protocol:** server ack means durably queued; recipient ack means decrypted and stored. The envelope is deleted on recipient ack or at TTL (for example 30 days).
- **Ordering:** per-sender, per-chat monotonic counters in the encrypted payload; the Double Ratchet tolerates out-of-order arrival within limits.
- **Reconnect:** on connect, a device drains its queue in order, then switches to live push.
- **Group fan-out:** one ciphertext, N envelope rows (one per member device) referencing the same blob to save storage.
- **Receipts in groups:** tracked per recipient, aggregated on the client.

### 6.3 Socket events (proposed)

| Event | Direction | Purpose |
| --- | --- | --- |
| `msg:send` | client to server | Submit envelopes for one logical message |
| `msg:accepted` | server to client | Durable-queue ack with clientMsgId |
| `msg:deliver` | server to client | Push an envelope to a recipient device |
| `msg:ack` | client to server | Recipient confirms decrypt and store |
| `receipt:update` | both | Delivered and read state |
| `keys:low` | server to client | Prompt to upload more one-time prekeys |
| `group:update` | server to client | Membership or metadata change |
| `call:invite` / `call:accept` / `call:reject` / `call:end` | both | Call lifecycle |
| `call:signal` | both | SDP and ICE relay (1:1) |
| `call:join` / `call:leave` | both | Group call room membership |

## 7. Calling

### 7.1 Topology decision

Assumption for the numbers below: about 1 Mbps per 720p video stream, 8 participants.

|  | Mesh (P2P) | SFU | MCU |
| --- | --- | --- | --- |
| Client upload | 7 streams, about 7 Mbps | 1 stream plus simulcast layers, about 1.5 Mbps | 1 stream |
| Client download | 7 streams | Up to 7 streams, reducible with layer selection and last-N | 1 composite stream |
| Server cost | None (TURN only) | Packet forwarding, no transcoding | High: decode, mix, encode |
| E2EE compatible | Yes | Yes, with frame-level encryption (SFrame) | No, server must decode |
| Verdict | Use for 1:1 | **Use for groups** | Rejected |

### 7.2 1:1 calls (peer-to-peer)

- Media goes directly between peers, with STUN for discovery and **TURN as fallback** when direct paths fail. The API issues short-lived TURN credentials (time-limited HMAC credentials, per the coturn REST-API scheme).
- Signaling (offer, answer, ICE candidates) travels over Socket.IO.
- **Authenticate the DTLS fingerprint.** WebRTC media is already encrypted with DTLS-SRTP end to end between the peers, even through TURN, but a malicious signaling server could swap SDP and man-in-the-middle the call. To prevent this, send the SDP offer and answer (or at least the fingerprints) **inside Signal-encrypted envelopes**, or sign them with the device identity key. This is the step that makes 1:1 calls truly E2EE and closes the gap noted in the README roadmap.
- Call state machine: `idle` to `ringing` to `connecting` to `active` to `ended`, with terminal reasons (`completed`, `rejected`, `missed`, `busy`, `failed`). State transitions are recorded in the `calls` table.
- Incoming calls while the app is closed use a high-priority push to wake the device; ring timeout of about 45 s then marks the call missed.

### 7.3 Group calls (SFU)

**How it works:** each participant publishes one upstream (audio plus simulcast video layers) to the SFU, which forwards selected layers to each subscriber without decoding the media.

**Choosing the SFU:**

| Option | Strengths | Trade-offs |
| --- | --- | --- |
| mediasoup | Node library, fits the existing stack, maximum control, good for learning | You build rooms, auth, scaling, recording and E2EE glue yourself |
| LiveKit (self-hosted or cloud) | Complete server and client SDKs, rooms, tokens, simulcast and E2EE support built in | Separate Go service to operate; less low-level control |

Recommendation: **mediasoup if the goal is a deep, controllable, Node-native build; LiveKit if the goal is shipping reliably quickly.** The rest of this design works with either.

**Room lifecycle:**

1. A member starts a call in a group chat; the API creates a `calls` row and an SFU room, then sends `call:invite` to members (push for offline devices).
2. Joiners request a short-lived, signed join token from the API (checks group membership), then connect to the SFU node that owns the room.
3. Participants publish and subscribe to tracks; the SFU handles active-speaker detection and layer selection.
4. When the last participant leaves, the room closes and the call is marked ended with total duration.

**Bandwidth controls:** simulcast (three layers), last-N or paginated video grids, lower layers for small tiles, audio-only mode, and congestion-adaptive layer switching.

**Scaling:** pin each room to one SFU node (room-to-node map in Redis); run one media worker per CPU core; autoscale nodes by participant and bandwidth load; open a UDP port range plus TCP and TLS fallback; add regional nodes later. Cascading one room across nodes is unnecessary at this size.

### 7.4 E2EE for group calls

The SFU forwards packets it cannot read if media is encrypted **per frame on the client** before packetization (WebRTC Encoded Transform / insertable streams, using an SFrame-style scheme). Transport encryption (DTLS-SRTP) still protects each hop.

- The call initiator generates a **call key** and sends it to each participant over their pairwise Signal sessions, inside E2EE envelopes.
- **Rotate the call key on every join and leave** so departed participants lose access and new joiners cannot decrypt earlier media.
- Leave codec packet headers (for example the leading bytes of VP8 or the Opus payload descriptors) unencrypted as required so the SFU can route and apply layer selection. LiveKit ships this scheme; with mediasoup the client-side transform is your responsibility.
- Trade-off: E2EE rules out server-side recording, transcription and mixing.

### 7.5 Upgrade from 1:1 to group

If a third person is added to a 1:1 call, migrate it to an SFU room (peers join the room, then drop the direct connection). Keep 1:1 on P2P by default for lower latency and zero SFU cost.

## 8. Data model

New or changed tables (PostgreSQL). Existing `users`, `sessions` and `calls` carry over; fields are indicative.

| Table | Key fields |
| --- | --- |
| `users` | id, phone (E.164), display name, avatar, created\_at |
| `devices` | id, user\_id, registration\_id, identity\_key\_pub, push\_token, push\_type, last\_seen, revoked\_at |
| `signed_prekeys` | device\_id, key\_id, public\_key, signature, created\_at |
| `one_time_prekeys` | device\_id, key\_id, public\_key, consumed\_at |
| `chats` | id, type (`direct` or `group`), created\_at |
| `groups` | chat\_id, name, avatar\_ref, membership\_version, created\_by |
| `chat_members` | chat\_id, user\_id, role (`admin` or `member`), joined\_version, left\_version |
| `envelopes` | id, client\_msg\_id, chat\_id, sender\_device\_id, recipient\_device\_id, type, ciphertext (bytea or blob ref), created\_at, expires\_at |
| `receipts` | envelope or message ref, recipient\_device\_id, delivered\_at, read\_at |
| `blobs` | id, owner\_user\_id, storage\_key, size, ciphertext\_sha256, expires\_at |
| `calls` | id, chat\_id, kind (`audio` or `video`), mode (`p2p` or `sfu`), initiator\_id, state, end\_reason, started\_at, ended\_at |
| `call_participants` | call\_id, user\_id, device\_id, joined\_at, left\_at |
| `sfu_rooms` | room\_id, call\_id, node\_id, created\_at, closed\_at |

Notes: no plaintext message content is stored; `envelopes` rows are deleted on ack, so the table stays small and can be partitioned by day. Group names and avatars are plaintext at first and can be encrypted later.

## 9. API surface (proposed)

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/...` | Firebase OTP exchange and JWT issue (existing) |
| `PUT /api/keys/bundle` | Upload identity, signed prekey and one-time prekeys |
| `GET /api/keys/:userId/devices` | Fetch device list and one prekey bundle per device (consumes a one-time prekey) |
| `POST /api/groups` and `PATCH /api/groups/:id/members` | Create group and manage members, admin only |
| `POST /api/media/upload-url` and `GET /api/media/:blobId/url` | Presigned URLs for encrypted blobs |
| `GET /api/calls/ice-servers` | Short-lived TURN credentials |
| `POST /api/calls/:id/sfu-token` | Signed join token after a group membership check |
| `GET /api/calls` | Call history |

Rate-limit the prekey fetch endpoint aggressively, since it consumes one-time prekeys and can be abused to exhaust them.

## 10. Scalability and deployment

- **Gateway:** run multiple Node instances behind a load balancer; use the Socket.IO Redis adapter and WebSocket transport (or sticky sessions if long-polling is kept). Presence is a per-device key with a TTL in Redis.
- **Database:** single primary PostgreSQL is sufficient early; partition `envelopes`; index on recipient device and created\_at; add read replicas only when needed.
- **Object storage:** S3-compatible with lifecycle rules matching blob expiry.
- **TURN:** one or more coturn nodes with public IPs, UDP and TLS-on-443 listeners; scale horizontally; DNS-based selection.
- **SFU:** dedicated hosts or nodes with public IPs and a UDP port range, separate from the API tier; autoscale on load.
- **Environments:** extend the existing Docker Compose setup with Redis, MinIO, coturn and an SFU for local development; CI should add the crypto test vectors and signaling tests.
- **Deploy order:** hosted backend first (currently only the frontend is live), then TURN, then SFU.

## 11. Security and threat model

| Threat | Mitigation |
| --- | --- |
| Server operator or database breach reads messages | E2EE; server stores ciphertext and public keys only |
| Malicious server substitutes keys (MITM) | Safety numbers, key-change warnings, optional key transparency later |
| Stolen device or token | Per-device sessions, revocation, local DB encryption, refresh-token rotation (existing hashed sessions) |
| Removed group member keeps reading | Sender key and call key rotation on every membership change |
| Call MITM via signaling | SDP fingerprints carried in E2EE envelopes or signed with the identity key |
| Prekey exhaustion attack | Rate limits, last-resort signed prekey, replenishment alerts |
| Abuse and spam | Per-user rate limits (Redis), report and block, contact-based discovery limits |
| Malicious web client delivery | CSP, SRI, signed and reproducible builds, native clients later |
| TURN abuse as open relay | Short-lived credentials, per-user bandwidth quotas |
| Metadata exposure | Content-free push, short retention, sealed sender as an option |

## 12. Reliability and observability

- **Metrics:** envelope queue depth and age, delivery latency, socket connection count, decrypt-failure rate (client-reported, content-free), call setup time, ICE success rate split by direct, STUN and TURN, SFU bitrate, packet loss and room count.
- **Logging:** structured logs with request and call IDs; never log ciphertext bodies, keys or SDP fingerprints.
- **Failure handling:** if a node dies, clients reconnect and drain the queue from Postgres; on SFU node failure, clients rejoin through a new token and a new room placement.
- **Testing:** unit tests with the library's test vectors, integration tests for key bootstrap and group rekeying, call tests with scripted headless browsers, and load tests for gateway and SFU capacity.

## 13. Phased roadmap

| Phase | Deliverable | Notes |
| --- | --- | --- |
| 0 | Foundations: Redis, object storage, deploy backend, TURN, TLS, Redis-backed rate limits | Unblocks everything else |
| 1 | E2EE 1:1 chat: key service, prekeys, envelope queue, local IndexedDB history, encrypted attachments | Do this before groups; retrofitting E2EE later is expensive |
| 2 | Group chat: groups and membership, Sender Keys, rotation, per-recipient receipts | Admin-signed membership changes |
| 3 | 1:1 calls hardening: TURN fallback, authenticated SDP fingerprints, call state machine, push for incoming calls | Closes the call E2EE gap |
| 4 | Group calls: SFU deployment, room tokens, simulcast, active speaker, last-N | Start with audio plus 4 to 8 video |
| 5 | Group call E2EE (SFrame, call key rotation), multi-device linking, encrypted backup, safety numbers polish | Hardening and parity features |

## 14. Risks and open decisions

1. **Browser Signal library:** confirm a maintained browser-capable implementation (or plan Rust to WASM) before Phase 1.
2. **History and E2EE:** moving history to the device changes the product (new device has no history). Decide whether to ship encrypted backup in v1.
3. **SFU choice:** mediasoup versus LiveKit, driven by whether the goal is learning depth or speed to production.
4. **Group call limits:** confirm the 8 video and 32 audio design points with real load tests and target devices.
5. **Web-only trust model:** acceptable for a first release? Plan native or desktop clients if the threat model requires it.
6. **Group membership trust:** how strongly clients should verify server-reported membership changes.
7. **Hosting cost:** SFU and TURN bandwidth is the dominant cost; model it before public launch.

---