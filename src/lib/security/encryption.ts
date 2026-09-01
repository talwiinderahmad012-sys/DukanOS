import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { logger } from '@/lib/logging';

/**
 * Server-side encryption for CCTV camera credentials.
 *
 * Camera.encryptedSecrets must hold AES-256-GCM ciphertext — never plaintext.
 * Values are serialized as `enc:v1:<iv hex>.<auth tag hex>.<ciphertext hex>`.
 * The 32-byte key is supplied exclusively via the CCTV_SECRETS_ENCRYPTION_KEY
 * environment variable (openssl rand -hex 32) and is never persisted or
 * returned to clients.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const PREFIX = 'enc:v1:';

function getEncryptionKey(): Buffer | null {
  const raw = (process.env.CCTV_SECRETS_ENCRYPTION_KEY || '').trim();
  if (!raw) return null;
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) {
    logger.error('CCTV_SECRETS_ENCRYPTION_KEY must be exactly 32 bytes of hex (openssl rand -hex 32)', {
      category: 'CCTV',
    });
    return null;
  }
  return key;
}

/** True when a valid encryption key is configured. */
export function isCameraEncryptionConfigured(): boolean {
  return getEncryptionKey() !== null;
}

/** Encrypt a plaintext secret. Returns null when no key is configured. */
export function encryptSecret(plaintext: string): string | null {
  const key = getEncryptionKey();
  if (!key) return null;
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('hex')}.${authTag.toString('hex')}.${ciphertext.toString('hex')}`;
}

/** Decrypt a value produced by encryptSecret. Returns null on any failure. */
export function decryptSecret(stored: string): string | null {
  if (!stored.startsWith(PREFIX)) return null;
  const key = getEncryptionKey();
  if (!key) return null;
  const parts = stored.slice(PREFIX.length).split('.');
  if (parts.length !== 3) return null;
  try {
    const [ivHex, tagHex, dataHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    if (iv.length !== IV_LENGTH || authTag.length !== 16 || data.length === 0) return null;
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
    return plaintext.toString('utf8');
  } catch {
    logger.error('Camera secret decryption failed (wrong key or corrupted value)', { category: 'CCTV' });
    return null;
  }
}

export interface CameraCredentials {
  username?: string;
  password?: string;
}

/**
 * Load camera credentials from the stored Camera.encryptedSecrets value.
 * Supports the encrypted v1 format and legacy plaintext JSON (written before
 * encryption existed). `reencryptNeeded` flags legacy values so callers can
 * transparently upgrade them on next use.
 */
export function loadCameraCredentials(stored: string | null | undefined): {
  credentials: CameraCredentials | null;
  reencryptNeeded: boolean;
} {
  if (!stored) return { credentials: null, reencryptNeeded: false };

  if (stored.startsWith(PREFIX)) {
    const plaintext = decryptSecret(stored);
    if (plaintext === null) return { credentials: null, reencryptNeeded: false };
    try {
      return { credentials: JSON.parse(plaintext) as CameraCredentials, reencryptNeeded: false };
    } catch {
      return { credentials: null, reencryptNeeded: false };
    }
  }

  // Legacy plaintext JSON — parse for use, but mark for re-encryption.
  try {
    return { credentials: JSON.parse(stored) as CameraCredentials, reencryptNeeded: true };
  } catch {
    return { credentials: null, reencryptNeeded: false };
  }
}
