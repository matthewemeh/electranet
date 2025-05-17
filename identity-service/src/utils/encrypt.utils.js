const { createCipheriv, createDecipheriv } = require('crypto');

// Secret key and initialization vector (IV)
const secretKey = Buffer.from(process.env.AES_SEC_KEY, 'hex'); // 32 bytes for AES-256
const iv = Buffer.from(process.env.AES_IV_KEY, 'hex'); // 16 bytes for AES block size

/**
 * @param {string} text string to be encrypted
 * @returns {string} encrypted string
 */
const encrypt = text => {
  const cipher = createCipheriv('aes-256-cbc', secretKey, iv);
  let encryptedData = cipher.update(text, 'utf8', 'hex');
  encryptedData += cipher.final('hex');
  return encryptedData;
};

/**
 * @param {string} encryptedData string to be decrypted
 * @returns {string} decrypted string
 */
const decrypt = encryptedData => {
  const decipher = createDecipheriv('aes-256-cbc', secretKey, iv);
  let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
  decryptedData += decipher.final('utf8');
  return decryptedData;
};

module.exports = { encrypt, decrypt };
