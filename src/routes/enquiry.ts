import express from 'express';
import { submitEnquiry, getEnquiries, updateEnquiryStatus, deleteEnquiry } from '../controllers/enquiryController';
import { isAdmin } from '../middleware/auth';

const router = express.Router();

// Public route
router.post('/submit', submitEnquiry as any);

// Admin routes
router.get('/admin/all', isAdmin as any, getEnquiries as any);
router.patch('/admin/:id/status', isAdmin as any, updateEnquiryStatus as any);
router.delete('/admin/:id', isAdmin as any, deleteEnquiry as any);

export default router;
