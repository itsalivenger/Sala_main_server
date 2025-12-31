import { Router } from 'express';
import { getPageContent, updatePageContent } from '../../controllers/admin/cmsController';
import { protect } from '../../middleware/auth';

const router = Router();

// GET is public for front-end pages
router.get('/', getPageContent);
router.post('/', protect, updatePageContent);

export default router;
