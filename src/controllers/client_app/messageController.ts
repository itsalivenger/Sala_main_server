import { Request, Response } from 'express';
import Order from '../../models/Order';
import Livreur from '../../models/Livreur';
import Client from '../../models/Client';
import { sendPushNotification } from '../../services/notificationService';

/**
 * @route   POST /api/client/orders/:orderId/messages
 * @desc    Send a message in order chat
 * @access  Protected (Client)
 */
/**
 * @route   POST /api/client/orders/:orderId/messages
 * @desc    Send a message in order chat
 * @access  Protected (Client)
 */
export const sendMessage = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const { text } = req.body;
        const clientId = (req as any).user.id; // JWT payload uses 'id'

        if (!text || text.trim() === '') {
            return res.status(400).json({ success: false, message: 'Le message ne peut pas être vide' });
        }

        // Find order and verify client ownership
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Commande introuvable' });
        }

        if (order.clientId.toString() !== clientId) {
            return res.status(403).json({ success: false, message: 'Accès non autorisé' });
        }

        // Add message to chat
        const newMessage = {
            sender: 'Client' as const,
            text: text.trim(),
            createdAt: new Date()
        };

        if (!order.chatMessages) {
            order.chatMessages = [];
        }
        order.chatMessages.push(newMessage);
        await order.save();

        // Background: Send Push Notification to Livreur
        try {
            if (order.livreurId) {
                const livreur = await Livreur.findById(order.livreurId).select('pushToken');
                if (livreur?.pushToken) {
                    const client = await Client.findById(clientId).select('name');
                    const clientName = client?.name || 'Votre client';

                    await sendPushNotification(
                        livreur.pushToken,
                        `Message de ${clientName}`,
                        text.trim(),
                        {
                            orderId: order._id.toString(),
                            type: 'CHAT_MESSAGE',
                            sender: 'Client'
                        }
                    );
                    console.log(`[PUSH] Sent chat notification to livreur ${order.livreurId}`);
                }
            }
        } catch (pushError) {
            console.error('[PUSH] Chat message notification failed:', pushError);
        }

        res.status(200).json({
            success: true,
            message: 'Message envoyé',
            chatMessage: newMessage
        });
    } catch (error) {
        console.error('[sendMessage] Error:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};

/**
 * @route   GET /api/client/orders/:orderId/messages
 * @desc    Get all messages for an order
 * @access  Protected (Client)
 */
export const getMessages = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const clientId = (req as any).user.id; // JWT payload uses 'id'

        // Find order and verify client ownership
        const order = await Order.findById(orderId).select('chatMessages clientId');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Commande introuvable' });
        }

        if (order.clientId.toString() !== clientId) {
            return res.status(403).json({ success: false, message: 'Accès non autorisé' });
        }

        res.status(200).json({
            success: true,
            messages: order.chatMessages || []
        });
    } catch (error) {
        console.error('[getMessages] Error:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
};
