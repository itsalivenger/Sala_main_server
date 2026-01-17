import { Router } from 'express';
import * as authController from '../../controllers/livreur/authController';
import { protect } from '../../middleware/auth';

const router = Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/verify', authController.verifyOtp);

// Protected routes
router.get('/profile', protect, authController.getProfile);
router.put('/profile/basic-info', protect, authController.updateBasicInfo);
router.put('/profile/documents', protect, authController.updateDocuments);
router.put('/profile/vehicle-photos', protect, authController.updateVehiclePhotos);
router.put('/profile/vehicle-papers', protect, authController.updateVehiclePapers);
router.put('/profile/selfie', protect, authController.updateSelfie);

// Complaint routes
router.get('/complaints', protect, authController.getComplaints);
router.post('/complaints', protect, authController.createComplaint);
router.get('/complaints/:id', protect, authController.getComplaintById);
router.post('/complaints/:id/messages', protect, authController.addComplaintMessage);
router.post('/push-token', protect, authController.savePushToken);
router.post('/profile/location', protect, authController.updateLocation);

export default router;
