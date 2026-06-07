import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// AES-256-GCM with a key derived from APP_ENCRYPTION_KEY via scrypt.
// Stored format: base64(salt || iv || authTag || ciphertext).

const ALGO = 'aes-256-gcm';
const KEY_LEN = 32;
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;

function getMasterSecret(): string {
  const secret = process.env.APP_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error(
      'APP_ENCRYPTION_KEY must be set to a strong 32+ character secret. Generate with: openssl rand -hex 32',
    );
  }
  return secret;
}

export function encryptString(plain: string): string {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = scryptSync(getMasterSecret(), salt, KEY_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, ciphertext]).toString('base64');
}

export function decryptString(blob: string): string {
  const buf = Buffer.from(blob, 'base64');
  const salt = buf.subarray(0, SALT_LEN);
  const iv = buf.subarray(SALT_LEN, SALT_LEN + IV_LEN);
  const tag = buf.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + TAG_LEN);
  const ciphertext = buf.subarray(SALT_LEN + IV_LEN + TAG_LEN);
  const key = scryptSync(getMasterSecret(), salt, KEY_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
