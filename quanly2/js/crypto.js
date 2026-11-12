/** WebCrypto only. Authentication failures retain OperationError for the login UI. */
export async function decrypt(json, password) {
  if (!globalThis.crypto?.subtle) throw new Error('Cần HTTPS hoặc localhost để giải mã.');
  const bytes = value => {
    if (typeof value !== 'string') throw new Error('Base64 không hợp lệ.');
    return Uint8Array.from(atob(value), c => c.charCodeAt(0));
  };
  if (json?.v !== 1 || json.kdf !== 'PBKDF2-SHA256' ||
      !Number.isSafeInteger(json.iter) || json.iter <= 0) {
    throw new Error('Định dạng mã hóa không được hỗ trợ.');
  }
  const salt = bytes(json.salt), iv = bytes(json.iv), ct = bytes(json.ct);
  if (salt.length !== 16 || iv.length !== 12 || ct.length < 16) {
    throw new Error('Dữ liệu mã hóa không hợp lệ.');
  }
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: json.iter },
    material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
  );
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, ct);
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext));
}
