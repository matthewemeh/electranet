const cors = require('cors');
const express = require('express');
const { connect, connection } = require('mongoose');
const { limiter } = require('./middlewares/ratelimit.middlewares');
const { urlVersioning } = require('./middlewares/version.middlewares');
const { globalErrorHandler } = require('./middlewares/error.middlewares');

require('dotenv').config();
const app = express();

const { PORT, MONGO_USERNAME, MONGO_PWD, WHITELISTED_DOMAINS } = process.env;
const connectionString = `mongodb+srv://${MONGO_USERNAME}:${MONGO_PWD}@cluster0.t0kiv.mongodb.net/electranet?retryWrites=true&w=majority&appName=Cluster0`;

const whitelistedDomains = WHITELISTED_DOMAINS.split(', ');
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || whitelistedDomains.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Version'],
};

app.use(cors(corsOptions));
app.use(limiter(100, 15 * 60 * 1000)); // 100 requests per 15 minutes
app.use(express.json());

connect(connectionString);
connection.once('open', () => console.log('MongoDB database connection established successfully'));

app.use(urlVersioning('v1'));
app.use('/api/v1/otps', require('./routes/otp.routes'));
app.use('/api/v1/votes', require('./routes/vote.routes'));
app.use('/api/v1/users', require('./routes/user.routes'));
app.use('/api/v1/admins', require('./routes/admin.routes'));
app.use('/api/v1/parties', require('./routes/party.routes'));
app.use('/api/v1/elections', require('./routes/election.routes'));
app.use('/api/v1/contestants', require('./routes/contestant.routes'));

app.use(globalErrorHandler);
app.use(express.urlencoded({ extended: true }));

app.listen(PORT, () => console.log('Server is running on port:', PORT));
