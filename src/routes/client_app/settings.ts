import express from 'express';
import { getSettings } from '../../controllers/admin/settings';

const router = express.Router();

// Publicly accessible settings for the client app
router.get('/', getSettings);

export default router;
