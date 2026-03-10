import request from 'supertest';
import app from '../src/app';
import { createTestUser, authHeader } from './helpers';

describe('Post API', () => {
  describe('GET /api/posts', () => {
    it('should return paginated feed', async () => {
      const user = await createTestUser('feeduser', 'feed@test.com');

      const res = await request(app)
        .get('/api/posts')
        .set(authHeader(user.accessToken));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('posts');
      expect(Array.isArray(res.body.posts)).toBe(true);
      expect(res.body).toHaveProperty('hasMore');
      expect(res.body).toHaveProperty('nextCursor');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/posts');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/posts', () => {
    it('should create a post with text', async () => {
      const user = await createTestUser('creator', 'creator@test.com');

      const res = await request(app)
        .post('/api/posts')
        .set(authHeader(user.accessToken))
        .field('text', 'Hello world!');

      expect(res.status).toBe(201);
      expect(res.body.post.text).toBe('Hello world!');
      expect(res.body.post.author.username).toBe('creator');
    });

    it('should return 400 if text is missing', async () => {
      const user = await createTestUser('creator2', 'creator2@test.com');

      const res = await request(app)
        .post('/api/posts')
        .set(authHeader(user.accessToken))
        .field('text', '');

      expect(res.status).toBe(400);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).post('/api/posts').field('text', 'Test');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/posts/:id', () => {
    it('should return a single post', async () => {
      const user = await createTestUser('getpost', 'getpost@test.com');

      const createRes = await request(app)
        .post('/api/posts')
        .set(authHeader(user.accessToken))
        .field('text', 'Single post test');

      const postId = createRes.body.post._id;

      const res = await request(app)
        .get(`/api/posts/${postId}`)
        .set(authHeader(user.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.post._id).toBe(postId);
    });

    it('should return 404 for non-existent post', async () => {
      const user = await createTestUser('notfound', 'notfound@test.com');

      const res = await request(app)
        .get('/api/posts/000000000000000000000000')
        .set(authHeader(user.accessToken));

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/posts/:id', () => {
    it('should update own post', async () => {
      const user = await createTestUser('updater', 'updater@test.com');

      const createRes = await request(app)
        .post('/api/posts')
        .set(authHeader(user.accessToken))
        .field('text', 'Original text');

      const postId = createRes.body.post._id;

      const res = await request(app)
        .put(`/api/posts/${postId}`)
        .set(authHeader(user.accessToken))
        .field('text', 'Updated text');

      expect(res.status).toBe(200);
      expect(res.body.post.text).toBe('Updated text');
    });

    it('should return 403 when editing another user post', async () => {
      const owner = await createTestUser('owner', 'owner@test.com');
      const other = await createTestUser('other', 'other@test.com');

      const createRes = await request(app)
        .post('/api/posts')
        .set(authHeader(owner.accessToken))
        .field('text', 'Owners post');

      const postId = createRes.body.post._id;

      const res = await request(app)
        .put(`/api/posts/${postId}`)
        .set(authHeader(other.accessToken))
        .field('text', 'Hacked');

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('should delete own post', async () => {
      const user = await createTestUser('deleter', 'deleter@test.com');

      const createRes = await request(app)
        .post('/api/posts')
        .set(authHeader(user.accessToken))
        .field('text', 'To be deleted');

      const postId = createRes.body.post._id;

      const res = await request(app)
        .delete(`/api/posts/${postId}`)
        .set(authHeader(user.accessToken));

      expect(res.status).toBe(200);

      const check = await request(app)
        .get(`/api/posts/${postId}`)
        .set(authHeader(user.accessToken));
      expect(check.status).toBe(404);
    });

    it('should return 403 when deleting another users post', async () => {
      const owner = await createTestUser('delowner', 'delowner@test.com');
      const other = await createTestUser('delother', 'delother@test.com');

      const createRes = await request(app)
        .post('/api/posts')
        .set(authHeader(owner.accessToken))
        .field('text', 'Keep this');

      const res = await request(app)
        .delete(`/api/posts/${createRes.body.post._id}`)
        .set(authHeader(other.accessToken));

      expect(res.status).toBe(403);
    });
  });
});
