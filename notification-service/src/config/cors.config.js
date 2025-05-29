const cors = require('cors');

const configureCors = () => {
  return cors({
    methods: 'GET',
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-auth-key'],
  });
};

module.exports = { configureCors };
