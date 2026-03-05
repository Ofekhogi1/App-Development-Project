import { Request, Response } from 'express';
import fs from 'fs';
import mongoose from 'mongoose';
import { Post } from '../models/post.model';
import { IUser } from '../models/user.model';
import { Like } from '../models/like.model';
import { interpretSearchQuery, generateEmbedding, cosineSimilarity, generateImageFromText, generateCaptionFromImage } from '../services/gemini.service';
import { asyncHandler } from '../utils/asyncHandler';
import { TaskType } from '@google/generative-ai';

const SIMILARITY_THRESHOLD = 0.6;
const MAX_POSTS_TO_SCAN = 500;

/**
 * @swagger
 * /api/ai/search:
 *   post:
 *     summary: Semantic search powered by Google Gemini embeddings
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *                 description: Natural language search query
 *               cursor:
 *                 type: string
 *                 description: Pagination offset (numeric string)
 *               limit:
 *                 type: integer
 *                 default: 10
 *     responses:
 *       200:
 *         description: Semantically ranked search results
 *       400:
 *         description: Query is required
 */
export const searchPosts = asyncHandler(async (req: Request, res: Response) => {
  const { query, cursor, limit: limitStr } = req.body as {
    query: string;
    cursor?: string;
    limit?: string;
  };

  if (!query || !query.trim()) {
    res.status(400).json({ message: 'Search query is required' });
    return;
  }

  const limit = Math.min(parseInt(limitStr || '10'), 50);
  const offset = cursor ? parseInt(cursor) : 0;

  let intent = { keywords: query.trim(), daysAgo: null as number | null };
  let aiUsed = false;

  // Step 1: Extract date intent from natural language
  try {
    intent = await interpretSearchQuery(query.trim());
    aiUsed = true;
  } catch (err) {
    console.error('Gemini NLU failed, proceeding with raw query:', err);
  }

  // Step 2: Generate semantic embedding for the query
  let queryEmbedding: number[] | null = null;
  try {
    queryEmbedding = await generateEmbedding(query.trim(), TaskType.RETRIEVAL_QUERY);
  } catch (err) {
    console.error('Embedding generation failed, falling back to text search:', err);
  }

  // Step 3: Build base filter (date only — no $text search)
  const baseFilter: Record<string, unknown> = {};
  if (intent.daysAgo !== null) {
    const since = new Date(Date.now() - intent.daysAgo * 24 * 60 * 60 * 1000);
    baseFilter.createdAt = { $gte: since };
  }

  // Step 4: Semantic search path — requires embeddings
  if (queryEmbedding) {
    // Build a regex that allows optional spaces between characters (handles "אלעל" matching "אל על")
    const normalizedKeyword = (intent.keywords || query.trim()).replace(/\s+/g, '');
    const regexPattern = normalizedKeyword.split('').join('\\s*');

    const [postsWithEmbeddings, regexPosts] = await Promise.all([
      Post.find(baseFilter)
        .select('+embedding')
        .populate('author', 'username avatarUrl')
        .limit(MAX_POSTS_TO_SCAN),
      Post.find({ ...baseFilter, text: { $regex: regexPattern, $options: 'i' } })
        .populate('author', 'username avatarUrl')
        .limit(50),
    ]);

    const ranked = postsWithEmbeddings
      .filter((p) => p.embedding && p.embedding.length > 0)
      .map((p) => ({
        post: p,
        score: cosineSimilarity(queryEmbedding!, p.embedding!),
      }))
      .filter((r) => r.score >= SIMILARITY_THRESHOLD)
      .sort((a, b) => b.score - a.score);

    // Merge: semantic results first, then regex matches not already included
    const seen = new Set(ranked.map((r) => r.post._id.toString()));
    const merged = ranked.map((r) => r.post);
    for (const p of regexPosts) {
      if (!seen.has(p._id.toString())) {
        seen.add(p._id.toString());
        merged.push(p);
      }
    }

    const page = merged.slice(offset, offset + limit + 1);
    const hasMore = page.length > limit;
    if (hasMore) page.pop();

    const nextCursor = hasMore ? String(offset + limit) : null;

    const userId = (req.user as IUser)._id;
    const postIds = page.map((p) => p._id);
    const likedDocs = await Like.find({ post: { $in: postIds }, user: userId }).select('post');
    const likedSet = new Set(likedDocs.map((l) => l.post.toString()));

    const postsWithLiked = page.map((p) => ({
      ...p.toObject(),
      embedding: undefined,
      liked: likedSet.has(p._id.toString()),
    }));

    res.json({
      posts: postsWithLiked,
      nextCursor,
      hasMore,
      intent,
      aiUsed,
      originalQuery: query.trim(),
    });
    return;
  }

  // Step 5: Fallback — text search when embedding unavailable
  const fallbackFilter: Record<string, unknown> = { ...baseFilter };
  if (intent.keywords) {
    fallbackFilter.$text = { $search: intent.keywords };
  }

  // Apply cursor-based pagination for fallback path
  if (cursor && cursor.includes('_')) {
    const [ts, id] = cursor.split('_');
    fallbackFilter.$or = [
      { createdAt: { $lt: new Date(ts) } },
      { createdAt: new Date(ts), _id: { $lt: new mongoose.Types.ObjectId(id) } },
    ];
  }

  const posts = await Post.find(fallbackFilter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate('author', 'username avatarUrl');

  const hasMore = posts.length > limit;
  if (hasMore) posts.pop();

  const nextCursor =
    hasMore && posts.length > 0
      ? `${posts[posts.length - 1].createdAt.toISOString()}_${posts[posts.length - 1]._id}`
      : null;

  const userId = (req.user as IUser)._id;
  const postIds = posts.map((p) => p._id);
  const likedDocs = await Like.find({ post: { $in: postIds }, user: userId }).select('post');
  const likedSet = new Set(likedDocs.map((l) => l.post.toString()));

  const postsWithLiked = posts.map((p) => ({
    ...p.toObject(),
    liked: likedSet.has(p._id.toString()),
  }));

  res.json({
    posts: postsWithLiked,
    nextCursor,
    hasMore,
    intent,
    aiUsed,
    originalQuery: query.trim(),
  });
});

/**
 * @swagger
 * /api/ai/generate-image:
 *   post:
 *     summary: Generate an image from post text using Imagen 3
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
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
 *       200:
 *         description: Base64-encoded JPEG image
 *       400:
 *         description: Text is required
 *       503:
 *         description: Image generation unavailable
 */
export const generateImage = asyncHandler(async (req: Request, res: Response) => {
  const { text } = req.body as { text: string };

  if (!text?.trim()) {
    res.status(400).json({ message: 'Text is required' });
    return;
  }

  const imageBase64 = await generateImageFromText(text.trim());
  if (!imageBase64) {
    res.status(503).json({ message: 'Image generation unavailable' });
    return;
  }

  res.json({ imageBase64 });
});

/**
 * @swagger
 * /api/ai/generate-caption:
 *   post:
 *     summary: Generate a caption for an uploaded image using Gemini Vision
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Generated caption text
 *       400:
 *         description: Image is required
 *       503:
 *         description: Caption generation unavailable
 */
export const generateCaption = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ message: 'Image is required' });
    return;
  }

  try {
    const caption = await generateCaptionFromImage(req.file.path, req.file.mimetype);
    if (!caption) {
      res.status(503).json({ message: 'Caption generation unavailable' });
      return;
    }
    res.json({ caption });
  } catch (err: unknown) {
    console.error('[generateCaption] error:', err);
    const status = (err as { status?: number })?.status;
    if (status === 429) {
      res.status(429).json({ message: 'AI rate limit reached. Please wait ~60 seconds and try again.' });
      return;
    }
    res.status(503).json({ message: 'Caption generation is currently unavailable. Please try again later.' });
    return;
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});
