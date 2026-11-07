-- Fix device_type enum and messages.content constraint
--
-- 1) device_type was created as ('phone','web') but the API accepts
--    'web' | 'ios' | 'android' | 'desktop' (see core/validation/schemas.js).
--    Onboarding from an iOS/Android device failed with:
--    "invalid input value for enum device_type".
--    Postgres cannot remove enum values, so 'phone' is left in place on
--    existing databases; fresh installs get the corrected list from
--    schemas/devices.sql.
--
-- 2) messages.content was NOT NULL, but media-only messages (mediaId set,
--    no text) insert NULL content and were rejected.

-- ALTER TYPE ... ADD VALUE can run inside a transaction on Postgres 12+,
-- as long as the new values are not used in the same transaction.
ALTER TYPE device_type ADD VALUE IF NOT EXISTS 'ios';
ALTER TYPE device_type ADD VALUE IF NOT EXISTS 'android';
ALTER TYPE device_type ADD VALUE IF NOT EXISTS 'desktop';

ALTER TABLE messages ALTER COLUMN content DROP NOT NULL;
