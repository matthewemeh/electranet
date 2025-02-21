const storage = require('../configs/firebase.config');
const { ref, getDownloadURL } = require('firebase/storage');

/**
 *
 * @param {string} filePath the file path in the firebase storage to be checked
 * @returns {boolean} a boolean indicating if specified file path exists in firebase storage
 */
const checkIfFileExists = async filePath => {
  const storageRef = ref(storage, filePath);
  try {
    await getDownloadURL(storageRef);
    return Promise.resolve(true);
  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      return Promise.resolve(false);
    } else {
      return Promise.reject(error);
    }
  }
};

module.exports = { checkIfFileExists };
