const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const mongoose = require('mongoose');

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
});

afterAll(async () => {
    await mongoose.connection.close();
});

beforeEach(async () => {
    await User.deleteMany({});
});

describe('User Registration', () => {
    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
                bvn: '12345678901'
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('token');
        expect(res.body.user).toHaveProperty('name', 'Test User');
        expect(res.body.user).toHaveProperty('email', 'test@example.com');
    });

    it('should not register a user with an existing email', async () => {
        await User.create({
            name: 'Existing User',
            email: 'existing@example.com',
            password: 'password123',
            bvn: '12345678901'
        });

        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test User',
                email: 'existing@example.com',
                password: 'password123',
                bvn: '12345678902'
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error', 'User already exists');
    });
});

describe('User Login', () => {
    it('should login an existing user', async () => {
        const user = await User.create({
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            bvn: '12345678901'
        });

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.user).toHaveProperty('name', 'Test User');
        expect(res.body.user).toHaveProperty('email', 'test@example.com');
    });

    it('should not login with incorrect password', async () => {
        await User.create({
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            bvn: '12345678901'
        });

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'wrongpassword'
            });

        expect(res.statusCode).toEqual(401);
        expect(res.body).toHaveProperty('error', 'Invalid credentials');
    });
});
