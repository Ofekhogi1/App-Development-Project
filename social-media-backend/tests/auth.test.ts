import request from 'supertest';
import app from '../src/app';

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user and return access token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.username).toBe('testuser');
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'user' });

      expect(res.status).toBe(400);
    });

    it('should return 400 if password is too short', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'user2', email: 'user2@test.com', password: '123' });

      expect(res.status).toBe(400);
    });

    it('should return 409 if email already exists', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'user1', email: 'dup@test.com', password: 'password123' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'user2', email: 'dup@test.com', password: 'password123' });

      expect(res.status).toBe(409);
    });

    it('should return 409 if username already exists', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'sameuser', email: 'a@test.com', password: 'password123' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'sameuser', email: 'b@test.com', password: 'password123' });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'loginuser', email: 'login@test.com', password: 'password123' });
    });

    it('should login with correct credentials (username)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'loginuser', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should login with correct credentials (email)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'login@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
    });

    it('should return 401 with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'loginuser', password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('should return 401 with non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'nobody', password: 'password123' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid cookie', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'refresh@test.com', password: 'password123' })
        .set('precedingRegister', '');

      // First register
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'refreshuser', email: 'refresh@test.com', password: 'password123' });

      const loginResult = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'refreshuser', password: 'password123' });

      const cookie = loginResult.headers['set-cookie']?.[0];
      expect(cookie).toBeDefined();

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookie || '');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
    });

    it('should return 401 without refresh cookie', async () => {
      const res = await request(app).post('/api/auth/refresh');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'logoutuser', email: 'logout@test.com', password: 'password123' });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'logoutuser', password: 'password123' });

      const cookie = loginRes.headers['set-cookie']?.[0];

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookie || '');

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/logged out/i);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ username: 'meuser', email: 'me@test.com', password: 'password123' });

      const { accessToken } = regRes.body;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('meuser');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(res.status).toBe(401);
    });
  });
});
