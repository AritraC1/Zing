-- Push notification delivery tokens (FCM registration tokens).
-- One token per device; the web client registers its token after login.
-- push_type records the delivery channel (currently "fcm"; "webpush" if
-- a raw Web Push path is added later).
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS push_token TEXT,
  ADD COLUMN IF NOT EXISTS push_type TEXT;
