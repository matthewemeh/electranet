const { getStorage } = require('firebase/storage');
const { initializeApp, setLogLevel } = require('firebase/app');

setLogLevel('silent');

const firebaseConfig = {
  appId: process.env.APP_ID,
  apiKey: process.env.API_KEY,
  projectId: process.env.PROJECT_ID,
  authDomain: process.env.AUTH_DOMAIN,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

module.exports = storage;
