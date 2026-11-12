-- E2EE key material (Signal protocol)
--
-- Devices no longer need an identity key at creation time: web/desktop
-- clients generate their Signal identity, signed prekey and one-time
-- prekeys after onboarding and upload them via POST /auth/keys/register.
-- `signed_prekey_id` records which signed prekey (key id) the stored
-- public key/signature belong to, so prekey bundles can be served.
ALTER TABLE devices ALTER COLUMN identity_public_key DROP NOT NULL;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS signed_prekey_id INTEGER;
