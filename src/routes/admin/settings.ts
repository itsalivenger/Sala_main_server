import express from 'express';
import { protect } from '../../middleware/auth';
import { getSettings, updateSettings } from '../../controllers/admin/settings';

const router = express.Router();

router.get('/', protect, getSettings);
router.post('/', protect, updateSettings);

export default router;
