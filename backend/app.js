const cors = require('cors');
const express = require('express');
const { connect, connection } = require('mongoose');

require('dotenv').config();
const app = express();

const { PORT, MONGO_USERNAME, MONGO_PWD } = process.env;
const connectionString = `mongodb+srv://${MONGO_USERNAME}:${MONGO_PWD}@cluster0.t0kiv.mongodb.net/electranet?retryWrites=true&w=majority&appName=Cluster0`;

app.use(cors());
app.use(express.json());

connect(connectionString);

connection.once('open', () => console.log('MongoDB database connection established successfully'));

app.use('/api/v1/otps', require('./routes/otp.routes'));
app.use('/api/v1/votes', require('./routes/vote.routes'));
app.use('/api/v1/users', require('./routes/user.routes'));
app.use('/api/v1/admins', require('./routes/admin.routes'));

app.use(express.urlencoded({ extended: true }));

app.listen(PORT, () => console.log(`Server is running on port: ${PORT}`));
