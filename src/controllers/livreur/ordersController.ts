import { Request, Response } from 'express';
import Order from '../../models/Order';
import mongoose from 'mongoose';
import { generateMockOrders } from '../../utils/mockOrders';

/**
 * @desc    Get available orders for livreurs (PAID status, not yet assigned)
 * @route   GET /api/livreur/orders/available
 * @access  Private/Livreur
 */
export const getAvailableOrders = async (req: Request, res: Response) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        // Build query for available orders
        const query = {
            status: 'SEARCHING_FOR_LIVREUR',
            livreurId: { $exists: false }
        };

        // Get total count for pagination
        const total = await Order.countDocuments(query);

        // Fetch orders with comprehensive data
        let orders = await Order.find(query)
            .populate('clientId', 'name phoneNumber city')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // If no real orders found, return empty array
        if (orders.length === 0 && page === 1) {
            console.log('[LIVREUR_ORDERS] No real orders found in database');
            res.status(200).json({
                success: true,
                orders: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    totalPages: 0,
                    hasMore: false
                }
            });
            return;
        }

        // Calculate pagination metadata
        const hasMore = total > (page * limit);
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            orders,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasMore
            }
        });
    } catch (error: any) {
        console.error('[LIVREUR_ORDERS] Get Available Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des commandes.' });
    }
};

/**
 * @desc    Get order details by ID
 * @route   GET /api/livreur/orders/:id
 * @access  Private/Livreur
 */
export const getOrderDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID de commande invalide.' });
        }

        const order = await Order.findById(id)
            .populate('clientId', 'name phoneNumber city')
            .lean();

        if (!order) {
            return res.status(404).json({ success: false, message: 'Commande non trouvée.' });
        }

        res.status(200).json({
            success: true,
            order
        });
    } catch (error: any) {
        console.error('[LIVREUR_ORDERS] Get Details Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des détails.' });
    }
};

/**
 * @desc    Accept an order (assign to livreur)
 * @route   POST /api/livreur/orders/:id/accept
 * @access  Private/Livreur
 */
export const acceptOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const livreurId = (req as any).user?.id;

        if (!livreurId) {
            return res.status(401).json({ success: false, message: 'Non autorisé.' });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID de commande invalide.' });
        }

        console.log(`[ACCEPT_ORDER] Attempting to accept order ID: ${id} by livreur: ${livreurId}`);
        const order = await Order.findById(id);
        console.log(`[ACCEPT_ORDER] Database search result: ${order ? 'Found' : 'Not Found'}`);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Commande non trouvée.' });
        }

        // Verify order is available
        if (order.status !== 'PAID' && order.status !== 'SEARCHING_FOR_LIVREUR') {
            return res.status(400).json({
                success: false,
                message: 'Cette commande n\'est plus disponible.'
            });
        }

        if (order.livreurId) {
            return res.status(400).json({
                success: false,
                message: 'Cette commande est déjà assignée.'
            });
        }

        // Assign order to livreur
        order.livreurId = new mongoose.Types.ObjectId(livreurId);
        order.status = 'ASSIGNED';

        // Add timeline entry
        order.timeline.push({
            status: 'ASSIGNED',
            timestamp: new Date(),
            actor: 'Livreur',
            note: 'Commande acceptée par le livreur'
        });

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Commande acceptée avec succès.',
            order
        });
    } catch (error: any) {
        console.error('[LIVREUR_ORDERS] Accept Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de l\'acceptation de la commande.' });
    }
};

/**
 * @desc    Reject an order
 * @route   POST /api/livreur/orders/:id/reject
 * @access  Private/Livreur
 */
export const rejectOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const livreurId = (req as any).user?.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID de commande invalide.' });
        }

        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Commande non trouvée.' });
        }

        // Add timeline entry for rejection
        order.timeline.push({
            status: 'REJECTED_BY_LIVREUR',
            timestamp: new Date(),
            actor: 'Livreur',
            note: reason || 'Commande refusée par le livreur'
        });

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Commande refusée.'
        });
    } catch (error: any) {
        console.error('[LIVREUR_ORDERS] Reject Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors du refus de la commande.' });
    }
};

/**
 * @desc    Get livreur's assigned orders
 * @route   GET /api/livreur/orders/my-orders
 * @access  Private/Livreur
 */
export const getMyOrders = async (req: Request, res: Response) => {
    try {
        const livreurId = (req as any).user?.id;

        if (!livreurId) {
            return res.status(401).json({ success: false, message: 'Non autorisé.' });
        }

        const orders = await Order.find({ livreurId })
            .populate('clientId', 'name phoneNumber')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            orders
        });
    } catch (error: any) {
        console.error('[LIVREUR_ORDERS] Get My Orders Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des commandes.' });
    }
};

/**
 * @desc    Get live tracking data for an order
 * @route   GET /api/livreur/orders/:id/tracking
 * @access  Private/Livreur
 */
export const getOrderTracking = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const livreurId = (req as any).user?.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID de commande invalide.' });
        }

        // Only allowed for the assigned livreur or maybe the client (but this is livreur controller)
        const order = await Order.findById(id)
            .populate('livreurId', 'lastLocation')
            .populate('clientId', 'lastPosition name phoneNumber')
            .lean();

        if (!order) {
            return res.status(404).json({ success: false, message: 'Commande non trouvée.' });
        }

        // Security: Ensure the requesting livreur is the one assigned
        if (order.livreurId?._id.toString() !== livreurId) {
            return res.status(403).json({ success: false, message: 'Non autorisé à suivre cette commande.' });
        }

        res.status(200).json({
            success: true,
            pickup: order.pickupLocation,
            dropoff: order.dropoffLocation,
            livreurLocation: (order.livreurId as any)?.lastLocation,
            clientLocation: (order.clientId as any)?.lastPosition,
            status: order.status
        });
    } catch (error: any) {
        console.error('[LIVREUR_TRACKING] Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération du suivi.' });
    }
};

/**
 * @desc    Send a message for an order
 * @route   POST /api/livreur/orders/:id/messages
 * @access  Private/Livreur
 */
export const sendOrderMessage = async (req: Request, res: Response) => {
    console.log(`[LIVREUR_CHAT] POST /messages for order: ${req.params.id}`);
    console.log(`[LIVREUR_CHAT] Body:`, JSON.stringify(req.body));
    console.log(`[LIVREUR_CHAT] User:`, (req as any).user?.id);
    try {
        const { id } = req.params;
        const { text } = req.body;
        const livreurId = (req as any).user?.id;

        if (!text) {
            return res.status(400).json({ success: false, message: 'Le message est vide.' });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Commande non trouvée.' });
        }

        // Security: Ensure the requesting livreur is assigned
        if (order.livreurId?.toString() !== livreurId) {
            return res.status(403).json({ success: false, message: 'Non autorisé.' });
        }

        if (!order.chatMessages) order.chatMessages = [];

        order.chatMessages.push({
            sender: 'Livreur',
            text,
            createdAt: new Date()
        });

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Message envoyé.',
            chatMessages: order.chatMessages
        });
    } catch (error: any) {
        console.error('[LIVREUR_CHAT] Send Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi du message.' });
    }
};

/**
 * @desc    Get chat messages for an order
 * @route   GET /api/livreur/orders/:id/messages
 * @access  Private/Livreur
 */
export const getOrderMessages = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const livreurId = (req as any).user?.id;

        const order = await Order.findById(id).select('chatMessages livreurId');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Commande non trouvée.' });
        }

        // Security
        if (order.livreurId?.toString() !== livreurId) {
            return res.status(403).json({ success: false, message: 'Non autorisé.' });
        }

        res.status(200).json({
            success: true,
            chatMessages: order.chatMessages || []
        });
    } catch (error: any) {
        console.error('[LIVREUR_CHAT] Get Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des messages.' });
    }
};
