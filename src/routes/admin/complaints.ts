import express from 'express';
import {
    getAllComplaints,
    getComplaintById,
    updateComplaintStatus,
    addComplaintMessage
} from '../../controllers/admin/complaintsController';
import { protect, authorize } from '../../middleware/auth';

const router = express.Router();

// All routes are protected and restricted to Admin
router.use(protect);
router.use(authorize('Super Admin', 'Manager', 'Support'));

router.route('/')
    .get(getAllComplaints);

router.route('/:id')
    .get(getComplaintById);

router.route('/:id/status')
    .put(updateComplaintStatus);

router.route('/:id/messages')
    .post(addComplaintMessage);

export default router;
