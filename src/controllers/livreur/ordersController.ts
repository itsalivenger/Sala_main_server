import { Request, Response } from 'express';
import Order from '../../models/Order';
import mongoose from 'mongoose';
import walletService from '../../services/walletService';
import Client from '../../models/Client';
import { sendPushNotification } from '../../services/notificationService';
import PlatformSettings from '../../models/PlatformSettings';
import Livreur from '../../models/Livreur';

/**
 * @desc    Get available orders for livreurs (PAID status, not yet assigned)
 * @route   GET /api/livreur/orders/available
 * @access  Private/Livreur
 */
export const getAvailableOrders = async (req: Request, res: Response) => {
    try {
        const livreurId = (req as any).user?.id;
        if (!livreurId) {
            return res.status(401).json({ success: false, message: 'Non autorisé.' });
        }

        // Pagination parameters
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        // Build query for available orders
        const query = {
            status: 'SEARCHING_FOR_LIVREUR',
            $or: [
                { eligibleLivreurs: { $in: [new mongoose.Types.ObjectId(livreurId)] } },
                { eligibleLivreurs: { $size: 0 } },
                { eligibleLivreurs: { $exists: false } }
            ]
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

        // If no orders found
        if (orders.length === 0 && page === 1) {
            return res.status(200).json({
                success: true,
                orders: [],
                pagination: { page, limit, total: 0, totalPages: 0, hasMore: false }
            });
        }

        // Calculate pagination metadata
        const hasMore = total > (page * limit);
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            orders,
            pagination: { page, limit, total, totalPages, hasMore }
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

        // Fetch Global Platform Settings for Vehicle Limits
        const settings = await PlatformSettings.findOne();
        const vehicleLimits = settings?.livreur?.vehicle_limits || {};

        res.status(200).json({
            success: true,
            order,
            vehicleLimits
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const livreurId = (req as any).user?.id;

        if (!livreurId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(401).json({ success: false, message: 'Non autorisé.' });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'ID de commande invalide.' });
        }

        // --- ENFORCE MAX ACTIVE ORDERS LIMIT ---
        const settings = await PlatformSettings.findOne().session(session);
        const maxActiveOrders = settings?.livreur?.max_active_orders || 3;
        const minRating = settings?.livreur?.min_rating_to_work || 4;

        const activeOrdersCount = await Order.countDocuments({
            livreurId: new mongoose.Types.ObjectId(livreurId),
            status: { $in: ['ASSIGNED', 'SHOPPING', 'PICKED_UP', 'IN_TRANSIT'] }
        }).session(session);

        if (activeOrdersCount >= maxActiveOrders) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({
                success: false,
                message: `Vous avez atteint la limite maximale de commandes actives (${maxActiveOrders}). Veuillez en livrer une avant d'en accepter une autre.`
            });
        }

        // --- ENFORCE MIN RATING LIMIT ---
        const livreur = await Livreur.findById(livreurId).session(session);
        if (!livreur) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'Livreur non trouvé.' });
        }

        if (livreur.averageRating > 0 && livreur.averageRating < minRating) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({
                success: false,
                message: `Votre note moyenne (${livreur.averageRating.toFixed(1)}) est insuffisante pour accepter de nouvelles commandes (Minimum: ${minRating}).`
            });
        }
        // --------------------------------------

        const order = await Order.findById(id).session(session);
        if (!order) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'Commande non trouvée.' });
        }

        // --- ENFORCE VEHICLE COMPATIBILITY ---
        const vehicleRank = { 'moto': 1, 'small_car': 2, 'large_car': 3 };
        const livreurRank = vehicleRank[livreur.vehicle?.type || 'moto'] || 1;
        const requiredRank = vehicleRank[order.requiredVehicle || 'moto'] || 1;

        if (livreurRank < requiredRank) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({
                success: false,
                message: `Votre véhicule (${livreur.vehicle?.type || 'moto'}) n'est pas compatible avec cette commande. (Requis: ${order.vehicleTypeLabel || 'Format Léger'})`
            });
        }
        // --------------------------------------

        console.log(`[ACCEPT_ORDER] Attempting to accept order ID: ${id} by livreur: ${livreurId}`);
        console.log(`[ACCEPT_ORDER] Database search result: ${order ? 'Found' : 'Not Found'}`);

        // Verify order is available
        if (order.status !== 'SEARCHING_FOR_LIVREUR') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Cette commande n\'est plus disponible.'
            });
        }

        // Ensure the livreur is eligible
        // Eligible if:
        // 1. Explicitly in the list
        // 2. List is empty (public order)
        // 3. List doesn't exist (legacy/public)
        const isListEmpty = !order.eligibleLivreurs || order.eligibleLivreurs.length === 0;
        const isInList = order.eligibleLivreurs?.some(id => id.toString() === livreurId);

        if (!isListEmpty && !isInList) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({
                success: false,
                message: 'Vous n\'êtes pas autorisé à accepter cette commande.'
            });
        }

        // --- SALA MARGIN LOGIC ---
        // Pass the session to deductMarginForOrder to use the same transaction
        const walletResult = await walletService.deductMarginForOrder(id, livreurId, session);

        if (!walletResult.success) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: walletResult.message || `Solde insuffisant pour accepter cette commande. (Commission Sala requise: ${order.pricing.platformMargin} DH).`
            });
        }
        // -------------------------

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

        await order.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: 'Commande acceptée avec succès.',
            order
        });
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
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

        // Send push notification to client
        try {
            const client = await Client.findById(order.clientId).select('pushToken');
            if (client?.pushToken) {
                await sendPushNotification(
                    client.pushToken,
                    'Nouveau message de votre livreur',
                    text.length > 100 ? text.substring(0, 100) + '...' : text,
                    {
                        type: 'CHAT_MESSAGE',
                        orderId: order._id.toString(),
                        sender: 'Livreur'
                    }
                );
            }
        } catch (pushErr) {
            console.error('[LIVREUR_CHAT] Push notification error:', pushErr);
            // Don't fail the message if push fails
        }

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
