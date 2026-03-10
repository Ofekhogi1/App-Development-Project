import request from 'supertest';
import app from '../src/app';
import { createTestUser, authHeader } from './helpers';

describe('Like API', () => {
  let user: { accessToken: string; userId: string };
  let postId: string;

  beforeEach(async () => {
    user = await createTestUser('liker', 'liker@test.com');
    const postRes = await request(app)
      .post('/api/posts')
      .set(authHeader(user.accessToken))
      .field('text', 'Post to like');
    postId = postRes.body.post._id;
  });

  describe('POST /api/likes/:postId (toggle)', () => {
    it('should like a post', async () => {
      const res = await request(app)
        .post(`/api/likes/${postId}`)
        .set(authHeader(user.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(true);
      expect(res.body.likeCount).toBe(1);
    });

    it('should unlike a post when liked again', async () => {
      await request(app)
        .post(`/api/likes/${postId}`)
        .set(authHeader(user.accessToken));

      const res = await request(app)
        .post(`/api/likes/${postId}`)
        .set(authHeader(user.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(false);
      expect(res.body.likeCount).toBe(0);
    });

    it('should return 404 for non-existent post', async () => {
      const res = await request(app)
        .post('/api/likes/000000000000000000000000')
        .set(authHeader(user.accessToken));

      expect(res.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).post(`/api/likes/${postId}`);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/likes/:postId/status', () => {
    it('should return liked: false before liking', async () => {
      const res = await request(app)
        .get(`/api/likes/${postId}/status`)
        .set(authHeader(user.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(false);
      expect(res.body.likeCount).toBe(0);
    });

    it('should return liked: true after liking', async () => {
      await request(app)
        .post(`/api/likes/${postId}`)
        .set(authHeader(user.accessToken));

      const res = await request(app)
        .get(`/api/likes/${postId}/status`)
        .set(authHeader(user.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(true);
      expect(res.body.likeCount).toBe(1);
    });

    it('should return 404 for non-existent post', async () => {
      const res = await request(app)
        .get('/api/likes/000000000000000000000000/status')
        .set(authHeader(user.accessToken));

      expect(res.status).toBe(404);
    });
  });
});
