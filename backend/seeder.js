const fs = require('fs');
const mongoose = require('mongoose');
const colors = require('colors');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: './config/config.env' });

// Load models
const User = require('./models/User');
const Contribution = require('./models/Contribution');
const Payment = require('./models/Payment');

// Connect to DB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
});

// Read JSON files
const users = JSON.parse(
    fs.readFileSync(`${__dirname}/_data/users.json`, 'utf-8')
);

const contributions = JSON.parse(
    fs.readFileSync(`${__dirname}/_data/contributions.json`, 'utf-8')
);

const payments = JSON.parse(
    fs.readFileSync(`${__dirname}/_data/payments.json`, 'utf-8')
);

// Import into DB
const importData = async () => {
    try {
        await User.create(users);
        await Contribution.create(contributions);
        await Payment.create(payments);
        console.log('Data Imported...'.green.inverse);
        process.exit();
    } catch (err) {
        console.error(err);
    }
};

// Delete data
const deleteData = async () => {
    try {
        await User.deleteMany();
        await Contribution.deleteMany();
        await Payment.deleteMany();
        console.log('Data Destroyed...'.red.inverse);
        process.exit();
    } catch (err) {
        console.error(err);
    }
};

if (process.argv[2] === '-i') {
    importData();
} else if (process.argv[2] === '-d') {
    deleteData();
}
