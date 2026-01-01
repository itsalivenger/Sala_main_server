import { Router } from 'express';
import {
    toggleAvailability,
    updateLocation,
    getAvailabilityStatus
} from '../../controllers/livreur/availabilityController';
import { protect } from '../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(protect);

// Get current availability status
router.get('/', getAvailabilityStatus);

// Toggle availability (online/offline)
router.post('/toggle', toggleAvailability);

// Update location
router.post('/location', updateLocation);

export default router;
