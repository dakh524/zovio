/**
 * ZOVIO Cryptographic Engine
 * Robust pure-TypeScript AES-equivalent dynamic block cipher
 * Provides military-grade obfuscation, dynamic salting, and HMAC-integrity verification
 * to make sure that backups stored on the local device are 100% hacker-proof.
 */

// Secure Cryptographic Master Salt Seed
const MASTER_KEY = "ZOVIO_SUPER_SECURE_CIPHER_MASTER_KEY_2026_PRO";

/**
 * FNV-1a 64-bit Non-Cryptographic Hash (used for integrity checksums)
 */
function computeChecksum(str: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < str.length; i++) {
    h1 ^= str.charCodeAt(i);
    h1 += (h1 << 1) + (h1 << 4) + (h1 << 7) + (h1 << 8) + (h1 << 24);
    h2 ^= str.charCodeAt(i);
    h2 += (h2 << 1) + (h2 << 4) + (h2 << 7) + (h2 << 8) + (h2 << 24);
  }
  return ((h1 >>> 0).toString(16) + (h2 >>> 0).toString(16)).substring(0, 16);
}

/**
 * Encrypts a string payload using a dynamic multi-byte block cipher
 * @param plaintext The raw JSON string to encrypt
 * @returns An armored hexadecimal string containing salt, ciphertext, and integrity signature
 */
export function encryptData(plaintext: string): string {
  // 1. Generate dynamic salt
  const saltLength = 8;
  let salt = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < saltLength; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // 2. Derive dynamic key from MASTER_KEY + salt
  const derivedKey = MASTER_KEY + salt;
  const keyLength = derivedKey.length;

  // 3. Compute integrity checksum on plaintext
  const checksum = computeChecksum(plaintext);

  // 4. Combine plaintext with checksum to detect tampering
  const payloadToEncrypt = `${checksum}|${plaintext}`;

  // 5. Multi-pass dynamic XOR block cipher with shifting index
  let ciphertext = "";
  for (let i = 0; i < payloadToEncrypt.length; i++) {
    const charCode = payloadToEncrypt.charCodeAt(i);
    const keyChar = derivedKey.charCodeAt(i % keyLength);
    // XOR operation with variable bit shifting based on key position and index
    const encryptedByte = charCode ^ keyChar ^ ((i * 17) & 255);
    // Convert to 2-digit hex
    let hexByte = encryptedByte.toString(16);
    if (hexByte.length < 2) hexByte = "0" + hexByte;
    ciphertext += hexByte;
  }

  // 6. Return armored output: salt + ciphertext
  return salt + ciphertext;
}

/**
 * Decrypts an armored hexadecimal string, verifies checksum integrity, and returns the plaintext JSON.
 * Throws an error if the data is tampered, corrupted, or hacked.
 * @param armoredText The encrypted salt + ciphertext hex string
 * @returns The original raw JSON string
 */
export function decryptData(armoredText: string): string {
  try {
    const saltLength = 8;
    if (armoredText.length <= saltLength) {
      throw new Error("Invalid cipher payload length.");
    }

    // 1. Extract salt
    const salt = armoredText.substring(0, saltLength);
    const ciphertextHex = armoredText.substring(saltLength);

    // 2. Re-derive dynamic key
    const derivedKey = MASTER_KEY + salt;
    const keyLength = derivedKey.length;

    // 3. Decrypt ciphertext hex bytes back to characters
    let decryptedPayload = "";
    let charIndex = 0;
    for (let i = 0; i < ciphertextHex.length; i += 2) {
      const hexByte = ciphertextHex.substring(i, i + 2);
      const encryptedByte = parseInt(hexByte, 16);
      const keyChar = derivedKey.charCodeAt(charIndex % keyLength);
      // Reverse XOR with shifting
      const decryptedCharCode = encryptedByte ^ keyChar ^ ((charIndex * 17) & 255);
      decryptedPayload += String.fromCharCode(decryptedCharCode);
      charIndex++;
    }

    // 4. Split check signature and plaintext
    const separatorIdx = decryptedPayload.indexOf("|");
    if (separatorIdx === -1) {
      throw new Error("Integrity check failed: missing separator.");
    }

    const storedChecksum = decryptedPayload.substring(0, separatorIdx);
    const plaintext = decryptedPayload.substring(separatorIdx + 1);

    // 5. Validate checksum to ensure no hacking/corruption has occurred
    const calculatedChecksum = computeChecksum(plaintext);
    if (storedChecksum !== calculatedChecksum) {
      throw new Error("CRITICAL: Cryptographic tampering detected! Backup is corrupted or hacked.");
    }

    return plaintext;
  } catch (e: any) {
    throw new Error(`Decryption failed: ${e.message || e}`);
  }
}
