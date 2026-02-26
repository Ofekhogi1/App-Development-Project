import { Router } from 'express';
import * as likeController from '../controllers/like.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/:postId', authenticate, likeController.toggleLike);
router.get('/:postId/status', authenticate, likeController.getLikeStatus);

export default router;
