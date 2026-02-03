import { Router } from 'express';
import { uploadMiddleware, uploadFile } from '../../controllers/admin/uploadController';
import { protect } from '../../middleware/auth';

const router = Router();

// Allow all authenticated livreurs to upload files (proof of delivery, registration docs, etc.)
router.post('/', protect, uploadMiddleware.array('files', 5), uploadFile);

export default router;
