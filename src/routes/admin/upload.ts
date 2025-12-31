import { Router } from 'express';
import { uploadMiddleware, uploadFile } from '../../controllers/admin/uploadController';
import { protect } from '../../middleware/auth';

const router = Router();

// Protect upload route if necessary, or keep public if needed for specific use cases
// Assuming admin usage, so protecting it.
router.post('/', protect, uploadMiddleware.single('file'), uploadFile);

export default router;
