import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as aiController from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadPostImage } from '../middleware/upload.middleware';

const router = Router();

const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { message: 'Too many AI requests, please try again in a minute' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/search', authenticate, aiRateLimiter, aiController.searchPosts);
router.post('/generate-image', authenticate, aiRateLimiter, aiController.generateImage);
router.post('/generate-caption', authenticate, aiRateLimiter, uploadPostImage, aiController.generateCaption);

export default router;
