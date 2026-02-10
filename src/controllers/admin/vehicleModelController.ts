import { Request, Response } from 'express';
import VehicleModel from '../../models/VehicleModel';

/**
 * @desc    Get all vehicle models
 * @route   GET /api/admin/vehicle-models
 * @access  Private/Admin
 */
export const getVehicleModels = async (_req: Request, res: Response) => {
    try {
        const models = await VehicleModel.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: models.length,
            data: models
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: 'Server Error',
            message: error.message
        });
    }
};

/**
 * @desc    Create a new vehicle model
 * @route   POST /api/admin/vehicle-models
 * @access  Private/Admin
 */
export const createVehicleModel = async (req: Request, res: Response) => {
    try {
        const { name, type } = req.body;

        if (!name || !type) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name and type'
            });
        }

        const model = await VehicleModel.create({ name, type });

        res.status(201).json({
            success: true,
            data: model
        });
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Vehicle model name already exists'
            });
        }
        res.status(500).json({
            success: false,
            error: 'Server Error',
            message: error.message
        });
    }
};

/**
 * @desc    Delete a vehicle model
 * @route   DELETE /api/admin/vehicle-models/:id
 * @access  Private/Admin
 */
export const deleteVehicleModel = async (req: Request, res: Response) => {
    try {
        const model = await VehicleModel.findById(req.params.id);

        if (!model) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle model not found'
            });
        }

        await model.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: 'Server Error',
            message: error.message
        });
    }
};
