const express = require('express');
const cors = require('cors');
const config = require('./config/');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const apiLimiter = require('./middleware/rateLimiter');
const csrfProtection = require('./middleware/csrfProtection');

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// Rate limiting
app.use('/api', apiLimiter);

// CSRF protection
app.use(csrfProtection);

// Mount routers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/contributions', require('./routes/contributions'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/verification', require('./routes/verification'));

// Error handler
app.use(errorHandler);

const PORT = config.PORT;

app.listen(PORT, () => {
    console.log(`Server running in ${config.NODE_ENV} mode on port ${PORT}`);
});

module.exports = app;
