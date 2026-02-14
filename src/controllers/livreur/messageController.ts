import { Request, Response } from 'express';
import Order from '../../models/Order';
import Client from '../../models/Client';
import { sendPushNotification } from '../../services/notificationService';

/**
 * @route   POST /api/livreur/orders/:id/messages
 * @desc    Send a message in order chat (Livreur)
 * @access  Protected (Livreur)
 */
export const sendMessage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        const livreurId = (req as any).user.id; // JWT payload uses 'id'

        if (!text || text.trim() === '') {
            return res.status(400).json({ success: false, message: 'Le message ne peut pas être vide' });
        }

        // Find order and verify livreur assignment
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Commande introuvable' });
        }

        if (!order.livreurId || order.livreurId.toString() !== livreurId) {
            return res.status(403).json({ success: false, message: 'Accès non autorisé - Vous n\'êtes pas assigné à cette commande' });
        }

        // Add message to chat
        const newMessage = {
            sender: 'Livreur' as const,
            text: text.trim(),
            createdAt: new Date()
        };

        if (!order.chatMessages) {
            order.chatMessages = [];
        }
        order.chatMessages.push(newMessage);
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Message envoyé',
            chatMessages: order.chatMessages
        });

        // Background: Send Push Notification to Client
        try {
            const client = await Client.findById(order.clientId).select('pushToken name notifications');
            if (client) {
                const livreurName = (req as any).user.name || 'Votre livreur';
                const title = `Message de ${livreurName}`;

                // Persist notification
                client.notifications.push({
                    title,
                    message: text.trim(),
                    type: 'General',
                    isRead: false,
                    createdAt: new Date()
                });
                await client.save();

                if (client.pushToken) {
                    await sendPushNotification(
                        client.pushToken,
                        title,
                        text.trim(),
                        { orderId: id, type: 'CHAT_MESSAGE' }
                    );
                }
            }
        } catch (pushError) {
            console.error('[PUSH] Chat message notification failed:', pushError);
        }

    } catch (error) {
        console.error('[Livreur sendMessage] Error:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

/**
 * @route   GET /api/livreur/orders/:id/messages
 * @desc    Get all messages for an order (Livreur)
 * @access  Protected (Livreur)
 */
export const getMessages = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const livreurId = (req as any).user.id; // JWT payload uses 'id'

        // Find order and verify livreur assignment
        const order = await Order.findById(id).select('chatMessages livreurId');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Commande introuvable' });
        }

        if (!order.livreurId || order.livreurId.toString() !== livreurId) {
            return res.status(403).json({ success: false, message: 'Accès non autorisé' });
        }

        res.status(200).json({
            success: true,
            chatMessages: order.chatMessages || []
        });

    } catch (error) {
        console.error('[Livreur getMessages] Error:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
