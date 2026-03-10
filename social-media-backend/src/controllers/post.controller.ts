import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { Post } from '../models/post.model';
import { IUser } from '../models/user.model';
import { Like } from '../models/like.model';
import { Comment } from '../models/comment.model';
import { asyncHandler } from '../utils/asyncHandler';
import { generateEmbedding } from '../services/gemini.service';

const buildCursorFilter = (cursor?: string, extraFilter: Record<string, unknown> = {}) => {
  if (!cursor) return extraFilter;
  const [ts, id] = cursor.split('_');
  return {
    ...extraFilter,
    $or: [
      { createdAt: { $lt: new Date(ts) } },
      { createdAt: new Date(ts), _id: { $lt: new mongoose.Types.ObjectId(id) } },
    ],
  };
};

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Get paginated post feed (cursor-based)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated list of posts
 */
export const getFeed = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const cursor = req.query.cursor as string | undefined;
  const filter = buildCursorFilter(cursor);

  const posts = await Post.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate('author', 'username avatarUrl');

  const hasMore = posts.length > limit;
  if (hasMore) posts.pop();

  const nextCursor =
    hasMore && posts.length > 0
      ? `${posts[posts.length - 1].createdAt.toISOString()}_${posts[posts.length - 1]._id}`
      : null;

  // Get liked status for current user
  const userId = (req.user as IUser)._id;
  const postIds = posts.map((p) => p._id);
  const likedDocs = await Like.find({ post: { $in: postIds }, user: userId }).select('post');
  const likedSet = new Set(likedDocs.map((l) => l.post.toString()));

  const postsWithLiked = posts.map((p) => ({
    ...p.toObject(),
    liked: likedSet.has(p._id.toString()),
  }));

  res.json({ posts: postsWithLiked, nextCursor, hasMore });
});

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Post created
 *       400:
 *         description: Text is required
 */
export const createPost = asyncHandler(async (req: Request, res: Response) => {
  const { text } = req.body as { text?: string };
  const hasText = text && text.trim();
  const hasImage = !!req.file;

  if (!hasText && !hasImage) {
    res.status(400).json({ message: 'Post must contain text or an image' });
    return;
  }

  const imageUrl = req.file ? `/uploads/posts/${req.file.filename}` : undefined;

  const post = await Post.create({
    author: (req.user as IUser)._id,
    text: hasText ? text!.trim() : '',
    imageUrl,
  });

  // Generate semantic embedding asynchronously — does not block the response
  if (hasText) {
    generateEmbedding(text!.trim())
      .then((embedding) => Post.findByIdAndUpdate(post._id, { embedding }))
      .catch((err) => console.error('Failed to generate post embedding:', err));
  }

  const populated = await post.populate('author', 'username avatarUrl');
  res.status(201).json({ post: { ...populated.toObject(), liked: false } });
});

/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     summary: Get a single post by ID
 *     tags: [Posts]
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
 *         description: Post data
 *       404:
 *         description: Post not found
 */
export const getPost = asyncHandler(async (req: Request, res: Response) => {
  const post = await Post.findById(req.params.id).populate('author', 'username avatarUrl');
  if (!post) {
    res.status(404).json({ message: 'Post not found' });
    return;
  }

  const liked = !!(await Like.findOne({ post: post._id, user: (req.user as IUser)._id }));
  res.json({ post: { ...post.toObject(), liked } });
});

/**
 * @swagger
 * /api/posts/{id}:
 *   put:
 *     summary: Update a post (owner only)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *               removeImage:
 *                 type: string
 *                 description: Set to "true" to remove existing image
 *     responses:
 *       200:
 *         description: Post updated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Post not found
 */
export const updatePost = asyncHandler(async (req: Request, res: Response) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(404).json({ message: 'Post not found' });
    return;
  }

  if (post.author.toString() !== (req.user as IUser)._id.toString()) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(403).json({ message: 'Not authorized to edit this post' });
    return;
  }

  const { text, removeImage } = req.body as { text?: string; removeImage?: string };
  const updates: { text?: string; imageUrl?: string | null } = {};

  if (text !== undefined && !text.trim()) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(400).json({ message: 'Post text cannot be empty' });
    return;
  }

  if (text && text.trim()) {
    updates.text = text.trim();
    // Regenerate embedding asynchronously when text changes
    generateEmbedding(text.trim())
      .then((embedding) => Post.findByIdAndUpdate(post._id, { embedding }))
      .catch((err) => console.error('Failed to regenerate post embedding:', err));
  }

  if (req.file) {
    // Delete old image
    if (post.imageUrl) {
      const oldPath = path.join(__dirname, '../../', post.imageUrl);
      fs.unlink(oldPath, () => {});
    }
    updates.imageUrl = `/uploads/posts/${req.file.filename}`;
  } else if (removeImage === 'true' && post.imageUrl) {
    const oldPath = path.join(__dirname, '../../', post.imageUrl);
    fs.unlink(oldPath, () => {});
    updates.imageUrl = null;
  }

  const updated = await Post.findByIdAndUpdate(post._id, { $set: updates }, { new: true }).populate(
    'author',
    'username avatarUrl'
  );

  const liked = !!(await Like.findOne({ post: post._id, user: (req.user as IUser)._id }));
  res.json({ post: { ...updated!.toObject(), liked } });
});

/**
 * @swagger
 * /api/posts/{id}:
 *   delete:
 *     summary: Delete a post (owner only)
 *     tags: [Posts]
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
 *         description: Post deleted
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Post not found
 */
export const deletePost = asyncHandler(async (req: Request, res: Response) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    res.status(404).json({ message: 'Post not found' });
    return;
  }

  if (post.author.toString() !== (req.user as IUser)._id.toString()) {
    res.status(403).json({ message: 'Not authorized to delete this post' });
    return;
  }

  // Delete image file
  if (post.imageUrl) {
    const imagePath = path.join(__dirname, '../../', post.imageUrl);
    fs.unlink(imagePath, () => {});
  }

  await Post.findByIdAndDelete(post._id);
  await Like.deleteMany({ post: post._id });
  await Comment.deleteMany({ post: post._id });

  res.json({ message: 'Post deleted successfully' });
});
