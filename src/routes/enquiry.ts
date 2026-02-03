import express from 'express';
import { submitEnquiry, getEnquiries, updateEnquiryStatus, deleteEnquiry } from '../controllers/enquiryController';
import { isAdmin } from '../middleware/auth'; // Assuming this exists for admin routes

const router = express.Router();

// Public route
router.post('/submit', submitEnquiry);

// Admin routes
router.get('/admin/all', isAdmin as any, getEnquiries);
router.patch('/admin/:id/status', isAdmin as any, updateEnquiryStatus);
router.delete('/admin/:id', isAdmin as any, deleteEnquiry);

export default router;
