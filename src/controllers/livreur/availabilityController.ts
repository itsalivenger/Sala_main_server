import { Request, Response } from 'express';
import Livreur from '../../models/Livreur';

/**
 * @desc    Toggle livreur availability (online/offline)
 * @route   POST /api/livreur/availability/toggle
 * @access  Private/Livreur
 */
export const toggleAvailability = async (req: Request, res: Response) => {
    try {
        const livreurId = (req as any).user?.id;

        if (!livreurId) {
            return res.status(401).json({ success: false, message: 'Non autorisé.' });
        }

        const livreur = await Livreur.findById(livreurId);

        if (!livreur) {
            return res.status(404).json({ success: false, message: 'Livreur non trouvé.' });
        }

        // Toggle the online status
        livreur.isOnline = !livreur.isOnline;
        await livreur.save();

        res.status(200).json({
            success: true,
            message: livreur.isOnline ? 'Vous êtes maintenant disponible.' : 'Vous êtes maintenant indisponible.',
            isOnline: livreur.isOnline
        });
    } catch (error: any) {
        console.error('[LIVREUR_AVAILABILITY] Toggle Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la disponibilité.' });
    }
};

/**
 * @desc    Update livreur location
 * @route   POST /api/livreur/availability/location
 * @access  Private/Livreur
 */
export const updateLocation = async (req: Request, res: Response) => {
    try {
        const livreurId = (req as any).user?.id;
        const { lat, lng } = req.body;

        if (!livreurId) {
            return res.status(401).json({ success: false, message: 'Non autorisé.' });
        }

        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: 'Latitude et longitude requises.' });
        }

        const livreur = await Livreur.findById(livreurId);

        if (!livreur) {
            return res.status(404).json({ success: false, message: 'Livreur non trouvé.' });
        }

        // Update location
        livreur.lastLocation = {
            lat: Number(lat),
            lng: Number(lng),
            timestamp: new Date()
        };
        await livreur.save();

        res.status(200).json({
            success: true,
            message: 'Localisation mise à jour.'
        });
    } catch (error: any) {
        console.error('[LIVREUR_AVAILABILITY] Update Location Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la localisation.' });
    }
};

/**
 * @desc    Get current availability status
 * @route   GET /api/livreur/availability
 * @access  Private/Livreur
 */
export const getAvailabilityStatus = async (req: Request, res: Response) => {
    try {
        const livreurId = (req as any).user?.id;

        if (!livreurId) {
            return res.status(401).json({ success: false, message: 'Non autorisé.' });
        }

        const livreur = await Livreur.findById(livreurId).select('isOnline lastLocation');

        if (!livreur) {
            return res.status(404).json({ success: false, message: 'Livreur non trouvé.' });
        }

        res.status(200).json({
            success: true,
            isOnline: livreur.isOnline || false,
            lastLocation: livreur.lastLocation || null
        });
    } catch (error: any) {
        console.error('[LIVREUR_AVAILABILITY] Get Status Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération du statut.' });
    }
};
