import express from 'express';
import { getPerformanceStats } from '../../controllers/livreur/performanceController';
import { protect, authorize } from '../../middleware/auth';

const router = express.Router();

router.use(protect);
router.use(authorize('livreur'));

router.get('/', getPerformanceStats);

export default router;
