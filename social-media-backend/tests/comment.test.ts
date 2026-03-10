import request from 'supertest';
import app from '../src/app';
import { createTestUser, authHeader } from './helpers';

describe('Comment API', () => {
  let user: { accessToken: string; userId: string; username: string };
  let postId: string;

  beforeEach(async () => {
    user = await createTestUser('commenter', 'commenter@test.com');
    const postRes = await request(app)
      .post('/api/posts')
      .set(authHeader(user.accessToken))
      .field('text', 'Post for comments');
    postId = postRes.body.post._id;
  });

  describe('GET /api/comments/:postId', () => {
    it('should return comments for a post', async () => {
      const res = await request(app)
        .get(`/api/comments/${postId}`)
        .set(authHeader(user.accessToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.comments)).toBe(true);
    });

    it('should return 404 for non-existent post', async () => {
      const res = await request(app)
        .get('/api/comments/000000000000000000000000')
        .set(authHeader(user.accessToken));

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/comments/:postId', () => {
    it('should add a comment to a post', async () => {
      const res = await request(app)
        .post(`/api/comments/${postId}`)
        .set(authHeader(user.accessToken))
        .send({ text: 'Great post!' });

      expect(res.status).toBe(201);
      expect(res.body.comment.text).toBe('Great post!');
      expect(res.body.comment.author.username).toBe('commenter');
    });

    it('should return 400 if text is empty', async () => {
      const res = await request(app)
        .post(`/api/comments/${postId}`)
        .set(authHeader(user.accessToken))
        .send({ text: '' });

      expect(res.status).toBe(400);
    });

    it('should increment post commentCount', async () => {
      await request(app)
        .post(`/api/comments/${postId}`)
        .set(authHeader(user.accessToken))
        .send({ text: 'Comment 1' });

      const postRes = await request(app)
        .get(`/api/posts/${postId}`)
        .set(authHeader(user.accessToken));

      expect(postRes.body.post.commentCount).toBe(1);
    });
  });

  describe('DELETE /api/comments/:id', () => {
    it('should delete own comment', async () => {
      const commentRes = await request(app)
        .post(`/api/comments/${postId}`)
        .set(authHeader(user.accessToken))
        .send({ text: 'Delete me' });

      const commentId = commentRes.body.comment._id;

      const res = await request(app)
        .delete(`/api/comments/${commentId}`)
        .set(authHeader(user.accessToken));

      expect(res.status).toBe(200);
    });

    it('should return 403 when deleting another users comment', async () => {
      const other = await createTestUser('othercommenter', 'othercommenter@test.com');

      const commentRes = await request(app)
        .post(`/api/comments/${postId}`)
        .set(authHeader(user.accessToken))
        .send({ text: 'This is mine' });

      const res = await request(app)
        .delete(`/api/comments/${commentRes.body.comment._id}`)
        .set(authHeader(other.accessToken));

      expect(res.status).toBe(403);
    });
  });
});
