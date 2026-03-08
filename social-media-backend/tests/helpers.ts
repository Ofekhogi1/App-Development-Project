import request from 'supertest';
import app from '../src/app';

export interface TestUser {
  accessToken: string;
  userId: string;
  username: string;
  email: string;
}

export const createTestUser = async (
  username = 'testuser',
  email = 'test@test.com',
  password = 'password123'
): Promise<TestUser> => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username, email, password });

  return {
    accessToken: res.body.accessToken,
    userId: res.body.user._id,
    username: res.body.user.username,
    email: res.body.user.email,
  };
};

export const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });
