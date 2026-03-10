import { Request, Response } from 'express';
import { Like } from '../models/like.model';
import { Post } from '../models/post.model';
import { IUser } from '../models/user.model';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * @swagger
 * /api/likes/{postId}:
 *   post:
 *     summary: Toggle like on a post
 *     tags: [Likes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like toggled
 *       404:
 *         description: Post not found
 */
export const toggleLike = asyncHandler(async (req: Request, res: Response) => {
  const post = await Post.findById(req.params.postId);
  if (!post) {
    res.status(404).json({ message: 'Post not found' });
    return;
  }

  const userId = (req.user as IUser)._id;
  const existing = await Like.findOne({ post: post._id, user: userId });

  if (existing) {
    await Like.findByIdAndDelete(existing._id);
    await Post.findByIdAndUpdate(post._id, { $inc: { likeCount: -1 } });
    res.json({ liked: false, likeCount: Math.max(0, post.likeCount - 1) });
  } else {
    await Like.create({ post: post._id, user: userId });
    await Post.findByIdAndUpdate(post._id, { $inc: { likeCount: 1 } });
    res.json({ liked: true, likeCount: post.likeCount + 1 });
  }
});

/**
 * @swagger
 * /api/likes/{postId}/status:
 *   get:
 *     summary: Check if current user liked a post
 *     tags: [Likes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like status
 *       404:
 *         description: Post not found
 */
export const getLikeStatus = asyncHandler(async (req: Request, res: Response) => {
  const post = await Post.findById(req.params.postId);
  if (!post) {
    res.status(404).json({ message: 'Post not found' });
    return;
  }

  const liked = !!(await Like.findOne({ post: post._id, user: (req.user as IUser)._id }));
  res.json({ liked, likeCount: post.likeCount });
});
