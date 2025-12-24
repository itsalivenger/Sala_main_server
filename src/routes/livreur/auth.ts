import { Router } from 'express';
import * as authController from '../../controllers/livreur/authController';
import { protect } from '../../middleware/auth';

const router = Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/verify', authController.verifyOtp);

// Protected routes
router.put('/profile/basic-info', protect, authController.updateBasicInfo);
router.put('/profile/documents', protect, authController.updateDocuments);
router.put('/profile/vehicle-photos', protect, authController.updateVehiclePhotos);
router.put('/profile/vehicle-papers', protect, authController.updateVehiclePapers);
router.put('/profile/selfie', protect, authController.updateSelfie);

export default router;
