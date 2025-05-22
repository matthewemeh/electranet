const { default: axios } = require('axios');

const faceApi = axios.create({
  baseURL: 'https://avnipay-faceid.onrender.com',
  headers: { 'Content-Type': 'multipart/form-data' },
});

module.exports = { faceApi };
