import express from 'express';
import { protect } from '../../middleware/auth';
import {
    getVehicleModels,
    createVehicleModel,
    deleteVehicleModel
} from '../../controllers/admin/vehicleModelController';

const router = express.Router();

// Admin protection middleare can be added if needed, protect is already imported
router.get('/', protect, getVehicleModels);
router.post('/', protect, createVehicleModel);
router.delete('/:id', protect, deleteVehicleModel);

export default router;
