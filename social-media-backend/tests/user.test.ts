import request from 'supertest';
import app from '../src/app';
import { createTestUser, authHeader } from './helpers';

describe('User API', () => {
  describe('GET /api/users/:id', () => {
    it('should return user profile', async () => {
      const user = await createTestUser('profileuser', 'profile@test.com');

      const res = await request(app)
        .get(`/api/users/${user.userId}`)
        .set(authHeader(user.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('profileuser');
      expect(res.body).toHaveProperty('posts');
      expect(res.body).toHaveProperty('hasMore');
    });

    it('should return 404 for non-existent user', async () => {
      const user = await createTestUser('user404', 'user404@test.com');

      const res = await request(app)
        .get('/api/users/000000000000000000000000')
        .set(authHeader(user.accessToken));

      expect(res.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const user = await createTestUser('authuser', 'authuser@test.com');

      const res = await request(app).get(`/api/users/${user.userId}`);
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update username', async () => {
      const user = await createTestUser('oldname', 'oldname@test.com');

      const res = await request(app)
        .put(`/api/users/${user.userId}`)
        .set(authHeader(user.accessToken))
        .field('username', 'newname');

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('newname');
    });

    it('should return 403 when trying to edit another user profile', async () => {
      const user1 = await createTestUser('user1edit', 'user1edit@test.com');
      const user2 = await createTestUser('user2edit', 'user2edit@test.com');

      const res = await request(app)
        .put(`/api/users/${user2.userId}`)
        .set(authHeader(user1.accessToken))
        .field('username', 'hacked');

      expect(res.status).toBe(403);
    });

    it('should return 409 if new username is already taken', async () => {
      const user1 = await createTestUser('taken', 'taken@test.com');
      const user2 = await createTestUser('changer', 'changer@test.com');

      const res = await request(app)
        .put(`/api/users/${user2.userId}`)
        .set(authHeader(user2.accessToken))
        .field('username', 'taken');

      expect(res.status).toBe(409);
    });
  });

  describe('PUT /api/users/:id/password', () => {
    it('should change password successfully', async () => {
      const user = await createTestUser('pwduser', 'pwduser@test.com', 'oldpass123');

      const res = await request(app)
        .put(`/api/users/${user.userId}/password`)
        .set(authHeader(user.accessToken))
        .send({ currentPassword: 'oldpass123', newPassword: 'newpass456' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password updated successfully');
    });

    it('should return 401 for wrong current password', async () => {
      const user = await createTestUser('pwdwrong', 'pwdwrong@test.com', 'correctpass');

      const res = await request(app)
        .put(`/api/users/${user.userId}/password`)
        .set(authHeader(user.accessToken))
        .send({ currentPassword: 'wrongpass', newPassword: 'newpass456' });

      expect(res.status).toBe(401);
    });

    it('should return 403 when changing another user password', async () => {
      const user1 = await createTestUser('pwdowner', 'pwdowner@test.com');
      const user2 = await createTestUser('pwdattacker', 'pwdattacker@test.com');

      const res = await request(app)
        .put(`/api/users/${user1.userId}/password`)
        .set(authHeader(user2.accessToken))
        .send({ currentPassword: 'password123', newPassword: 'newpass456' });

      expect(res.status).toBe(403);
    });

    it('should return 400 for new password shorter than 6 chars', async () => {
      const user = await createTestUser('pwdshort', 'pwdshort@test.com', 'password123');

      const res = await request(app)
        .put(`/api/users/${user.userId}/password`)
        .set(authHeader(user.accessToken))
        .send({ currentPassword: 'password123', newPassword: '123' });

      expect(res.status).toBe(400);
    });
  });
});
