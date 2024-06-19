import request from 'supertest';
import app from '../server';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

let token;

beforeAll(async () => {
  await dbClient.filesCollection().deleteMany({});
  await dbClient.usersCollection().deleteMany({});
  await redisClient.flushall();
});

describe('Endpoints', () => {
  it('GET /status', async () => {
    const res = await request(app).get('/status');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('redis');
    expect(res.body).toHaveProperty('db');
  });

  it('GET /stats', async () => {
    const res = await request(app).get('/stats');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('users');
    expect(res.body).toHaveProperty('files');
  });

  it('POST /users', async () => {
    const res = await request(app).post('/users').send({
      email: 'bob@dylan.com',
      password: 'password123'
    });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('email');
  });
