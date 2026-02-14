import { Request, Response } from 'express';
import Client from '../../models/Client';

/**
 * @desc    Create a new support reclamation
 * @route   POST /client/support/reclamations
 * @access  Private
 */
export const createReclamation = async (req: Request, res: Response) => {
    try {
        const { category, subject, message, orderId } = req.body;
        const userId = (req as any).user?.id;

        console.log('[SupportController] Received payload:', { category, subject, message, orderId, userId: userId });

        if (!message) {
            return res.status(400).json({ success: false, message: 'Le message est obligatoire.' });
        }

        const user = await Client.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
        }

        const finalSubject = category === 'Réclamation' && orderId
            ? `Réclamation - Commande ${orderId}`
            : (subject || category);

        const newReclamation = {
            subject: finalSubject,
            category,
            status: 'Open',
            requesterInfo: {
                name: user.name || 'Inconnu',
                phoneNumber: user.phoneNumber,
                city: user.city || 'Inconnue',
            },
            messages: [
                {
                    sender: 'User',
                    text: message,
                    createdAt: new Date(),
                }
            ],
            createdAt: new Date(),
        };

        user.complaints.push(newReclamation as any);
        await user.save();

        res.status(201).json({
            success: true,
            message: 'Réclamation créée avec succès.',
            reclamation: user.complaints[user.complaints.length - 1],
        });
    } catch (error: any) {
        console.error('[SUPPORT] Create Reclamation Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la création de la réclamation.' });
    }
};

/**
 * @desc    Get all reclamations for current user
 * @route   GET /client/support/reclamations
 * @access  Private
 */
export const getReclamations = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const user = await Client.findById(userId).select('complaints');

        if (!user) {
            return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
        }

        // Sort by newest first
        const sortedReclamations = user.complaints.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        res.status(200).json({
            success: true,
            reclamations: sortedReclamations,
        });
    } catch (error: any) {
        console.error('[SUPPORT] Get Reclamations Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des réclamations.' });
    }
};

/**
 * @desc    Send a message in a reclamation
 * @route   POST /client/support/reclamations/:reclamationId/messages
 * @access  Private
 */
export const sendReclamationMessage = async (req: Request, res: Response) => {
    try {
        const { reclamationId } = req.params;
        const { text } = req.body;
        const userId = (req as any).user?.id;

        if (!text) {
            return res.status(400).json({ success: false, message: 'Le message est vide.' });
        }

        const user = await Client.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
        }

        const reclamation = (user.complaints as any).id
            ? (user.complaints as any).id(reclamationId)
            : user.complaints.find((c: any) => c._id?.toString() === reclamationId);

        if (!reclamation) {
            return res.status(404).json({ success: false, message: 'Réclamation non trouvée.' });
        }

        if (reclamation.status === 'Resolved') {
            return res.status(400).json({ success: false, message: 'Cette réclamation est résolue et ne peut plus recevoir de messages.' });
        }

        reclamation.messages.push({
            sender: 'User',
            text,
            createdAt: new Date(),
        });

        await user.save();

        res.status(200).json({
            success: true,
            reclamation,
        });
    } catch (error: any) {
        console.error('[SUPPORT] Send Message Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi du message.' });
    }
};
