import { Router } from 'express';
import {
    getDashboardStats,
    getDashboardAnalytics,
    getDashboardFleet,
    getRecentActivity
} from '../../controllers/admin/dashboardController';
import { protect } from '../../middleware/auth';

const router = Router();

router.get('/stats', protect, getDashboardStats);
router.get('/analytics', protect, getDashboardAnalytics);
router.get('/fleet', protect, getDashboardFleet);
router.get('/activity', protect, getRecentActivity);

export default router;
