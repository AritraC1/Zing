ALTER TABLE media
ADD CONSTRAINT fk_media_uploader
FOREIGN KEY (uploader_id) REFERENCES users(id);

ALTER TABLE users
ADD CONSTRAINT fk_avatar_media
FOREIGN KEY (avatar_media_id)
REFERENCES media(id)
ON DELETE SET NULL;