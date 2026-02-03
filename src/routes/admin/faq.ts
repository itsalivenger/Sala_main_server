import express from 'express';
import * as faqController from '../../controllers/admin/faqController';
import { isAdmin } from '../../middleware/auth'; // Assuming this exists based on project structure

const router = express.Router();

// Public route (could also be in a different file, but keeping it here for simplicity since it's FAQ)
router.get('/public', faqController.getPublicFaqs);

// Admin protected routes
router.use(isAdmin);

router.get('/', faqController.getFaqs);
router.post('/', faqController.createFaq);
router.put('/:id', faqController.updateFaq);
router.delete('/:id', faqController.deleteFaq);

export default router;
