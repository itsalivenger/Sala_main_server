import { Request, Response } from 'express';
import Settings from '../../models/Settings';

export const getSettings = async (req: Request, res: Response) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }
        res.json(settings);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const body = req.body;
        let settings = await Settings.findOne();

        if (!settings) {
            settings = await Settings.create(body);
        } else {
            Object.assign(settings, body);
            await settings.save();
        }

        res.json(settings);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
