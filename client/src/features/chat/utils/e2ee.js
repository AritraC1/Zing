// Chat-side glue between the Signal E2EE layer and the message flow.
//
// Sending (1:1 chats): plaintext content is replaced by an envelope
// encrypted per device. Group chats are passed through untouched until
// Sender Keys land.
//
// Receiving: envelope content is decrypted for this device. Anything
// that cannot be decrypted (wrong device, missing ratchet state)
// renders as a locked placeholder rather than ciphertext garbage.

import * as signalService from "../../../core/crypto/signalService";
import { isEnvelope } from "../../../core/crypto/envelope";

// Shown when an E2EE envelope cannot be decrypted on this device
// (e.g. ratchet state lost) — never show raw ciphertext to users.
export const UNDECRYPTABLE_PLACEHOLDER = "🔒 Encrypted message";

/**
 * Encrypt message content for a direct conversation.
 *
 * @param {string} peerUserId the other participant's user id
 * @param {string} plaintext
 * @returns {Promise<string>} envelope string
 * @throws when no E2EE session could be established
 */
export async function encryptDirectContent(peerUserId, plaintext) {
  return signalService.encryptDirect(peerUserId, plaintext);
}

/**
 * Decrypt message content coming from a direct conversation.
 *
 * @param {string} senderUserId
 * @param {string} content
 * @returns {Promise<string>} plaintext, a passthrough of plaintext
 *   content, or the locked placeholder when undecryptable.
 */
export async function decryptDirectContent(senderUserId, content) {
  if (!isEnvelope(content)) return content;

  const plaintext = await signalService.decryptDirect(senderUserId, content);
  return plaintext === null ? UNDECRYPTABLE_PLACEHOLDER : plaintext;
}

/**
 * Map a list of message objects through decryption for direct chats.
 * Returns new objects; the inputs are not mutated.
 */
export async function decryptMessages(
  messages,
  { senderIdField = "sender_id", ctx } = {},
) {
  if (!Array.isArray(messages) || messages.length === 0) return messages;

  // Batch: only decrypt messages that actually carry an envelope.
  const out = new Array(messages.length);
  const pending = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (!isEnvelope(message?.content)) {
      out[i] = message;
    } else {
      pending.push(i);
    }
  }

  await Promise.all(
    pending.map(async (i) => {
      const message = messages[i];
      const plaintext = await signalService.decryptDirect(
        message[senderIdField],
        message.content,
        { ctx },
      );
      out[i] = {
        ...message,
        content:
          plaintext === null || plaintext === undefined
            ? UNDECRYPTABLE_PLACEHOLDER
            : plaintext,
      };
    }),
  );

  return out;
}

/**
 * Chat-list previews: the server's last_message is ciphertext for
 * direct chats — show the placeholder instead of leaking a garbled
 * base64 blob into the UI.
 */
export function previewForContent(content) {
  return isEnvelope(content) ? UNDECRYPTABLE_PLACEHOLDER : content;
}
