import { Request, Response } from 'express';
import { Comment } from '../models/comment.model';
import { Post } from '../models/post.model';
import { IUser } from '../models/user.model';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * @swagger
 * /api/comments/{postId}:
 *   get:
 *     summary: Get all comments for a post
 *     tags: [Comments]
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
 *         description: List of comments
 *       404:
 *         description: Post not found
 */
export const getComments = asyncHandler(async (req: Request, res: Response) => {
  const post = await Post.findById(req.params.postId);
  if (!post) {
    res.status(404).json({ message: 'Post not found' });
    return;
  }

  const comments = await Comment.find({ post: post._id })
    .sort({ createdAt: 1 })
    .populate('author', 'username avatarUrl');

  res.json({ comments });
});

/**
 * @swagger
 * /api/comments/{postId}:
 *   post:
 *     summary: Add a comment to a post
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment created
 *       404:
 *         description: Post not found
 */
export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const { text } = req.body as { text: string };

  if (!text || !text.trim()) {
    res.status(400).json({ message: 'Comment text is required' });
    return;
  }

  const post = await Post.findById(req.params.postId);
  if (!post) {
    res.status(404).json({ message: 'Post not found' });
    return;
  }

  const comment = await Comment.create({
    post: post._id,
    author: (req.user as IUser)._id,
    text: text.trim(),
  });

  await Post.findByIdAndUpdate(post._id, { $inc: { commentCount: 1 } });

  const populated = await comment.populate('author', 'username avatarUrl');
  res.status(201).json({ comment: populated });
});

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Delete a comment (comment author or post author)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment deleted
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Comment not found
 */
export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) {
    res.status(404).json({ message: 'Comment not found' });
    return;
  }

  const currentUserId = (req.user as IUser)._id.toString();
  const isCommentAuthor = comment.author.toString() === currentUserId;

  // Also allow the post author to delete comments on their post
  const post = await Post.findById(comment.post).select('author');
  const isPostAuthor = post?.author.toString() === currentUserId;

  if (!isCommentAuthor && !isPostAuthor) {
    res.status(403).json({ message: 'Not authorized to delete this comment' });
    return;
  }

  await Comment.findByIdAndDelete(comment._id);
  await Post.findByIdAndUpdate(comment.post, { $inc: { commentCount: -1 } });

  res.json({ message: 'Comment deleted successfully' });
});
