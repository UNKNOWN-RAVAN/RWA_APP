import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = '638udh3829162018';
const ENCRYPTION_IV = 'fedcba9876543210';

export function encryptUrl(url) {
  try {
    const encrypted = CryptoJS.AES.encrypt(url, CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY), {
      iv: CryptoJS.enc.Utf8.parse(ENCRYPTION_IV),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
  } catch (e) {
    console.error('Encryption error:', e);
    return url;
  }
}

export function decryptUrl(encrypted) {
  try {
    const decrypted = CryptoJS.AES.decrypt(encrypted, CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY), {
      iv: CryptoJS.enc.Utf8.parse(ENCRYPTION_IV),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    console.error('Decryption error:', e);
    return encrypted;
  }
}

export function decryptContent(enc) {
  try {
    if (!enc) return "";
    const encPart = enc.includes(':') ? enc.split(':')[0] : enc;
    const decoded = CryptoJS.enc.Base64.parse(encPart);
    const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
    const iv = CryptoJS.enc.Utf8.parse(ENCRYPTION_IV);
    const decrypted = CryptoJS.AES.decrypt({ ciphertext: decoded }, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return "";
  }
}