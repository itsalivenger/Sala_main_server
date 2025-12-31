import { Router } from 'express';
import { getPageContent, updatePageContent, resetPageContent } from '../../controllers/admin/cmsController';
import { protect } from '../../middleware/auth';

const router = Router();

// GET is public for front-end pages
router.get('/', getPageContent);
router.post('/', protect, updatePageContent);
router.post('/reset', protect, resetPageContent);

export default router;
