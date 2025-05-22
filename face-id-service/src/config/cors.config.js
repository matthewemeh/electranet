const cors = require('cors');

const configureCors = () => {
  return cors({
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-auth-key'],
  });
};

module.exports = { configureCors };
