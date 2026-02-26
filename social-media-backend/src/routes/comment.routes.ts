import { Router } from 'express';
import * as commentController from '../controllers/comment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/:postId', authenticate, commentController.getComments);
router.post('/:postId', authenticate, commentController.addComment);
router.delete('/:id', authenticate, commentController.deleteComment);

export default router;
