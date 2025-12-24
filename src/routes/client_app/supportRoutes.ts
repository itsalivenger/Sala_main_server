import express from 'express';
import { createReclamation, getReclamations, sendReclamationMessage } from '../../controllers/client_app/supportController';
import { protect } from '../../middleware/auth';

const router = express.Router();

// All routes are protected
router.use(protect);

router.route('/reclamations')
    .get(getReclamations)
    .post(createReclamation);

router.route('/reclamations/:reclamationId/messages')
    .post(sendReclamationMessage);

export default router;
