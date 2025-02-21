const { compare, hash } = require('bcrypt');

/**
 *
 * @param {any} data to be hashed
 * @param {string | number} saltRounds the number of salt rounds to be used for encryption
 * @returns {string} encrypted data salt
 */
const hashData = async (data, saltRounds = 30) => {
  try {
    const hashedData = await hash(data, saltRounds);
    return hashedData;
  } catch (error) {
    throw error;
  }
};

/**
 *
 * @param {string} unhashed unhashed data
 * @param {string} hashed hashed data
 * @returns {boolean} a value indicating the equality of the hashed and unhashed data
 */
const verifyHashedData = async (unhashed, hashed) => {
  try {
    const match = await compare(unhashed, hashed);
    return match;
  } catch (error) {
    throw error;
  }
};

module.exports = { hashData, verifyHashedData };
