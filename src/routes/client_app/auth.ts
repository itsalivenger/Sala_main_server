import { Router } from 'express';
import * as authController from '../../controllers/client_app/authController';
import { protect } from '../../middleware/auth';

const router = Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/verify', authController.verifyOtp);

// Protected routes
router.put('/profile', protect, authController.updateProfile);

export default router;
