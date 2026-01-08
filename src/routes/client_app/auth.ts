import { Router } from 'express';
import * as authController from '../../controllers/client_app/authController';
import { protect } from '../../middleware/auth';

const router = Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/verify', authController.verifyOtp);

// Protected routes
router.put('/profile', protect, authController.updateProfile);
router.post('/phone-change/request', protect, authController.requestPhoneChange);
router.post('/phone-change/verify', protect, authController.verifyPhoneChange);
router.post('/push-token', protect, authController.savePushToken);

export default router;
