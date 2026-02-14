import { Request, Response } from 'express';
import Order from '../../models/Order';
import mongoose from 'mongoose';
import Client from '../../models/Client';
import walletService from '../../services/walletService';
import { sendPushNotification } from '../../services/notificationService';

/**
 * @desc    Mark order as shopping (for market/shopping orders)
 * @route   PATCH /api/livreur/orders/:id/shopping
 * @access  Private/Livreur
 */
export const markOrderShopping = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const livreurId = (req as any).user?.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'ID de commande invalide.' });
        }

        const order = await Order.findById(id).session(session);

        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Commande non trouvée.' });
        }

        // Verify order belongs to this livreur and is in ASSIGNED status
        if (!order.livreurId || order.livreurId.toString() !== livreurId) {
            await session.abortTransaction();
            return res.status(403).json({ success: false, message: 'Cette commande ne vous est pas assignée.' });
        }

        if (order.status !== 'ASSIGNED') {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Impossible de démarrer les achats. Statut actuel: ${order.status}`
            });
        }

        // Update status
        order.status = 'SHOPPING';
        order.timeline.push({
            status: 'SHOPPING',
            timestamp: new Date(),
            actor: 'Livreur',
            note: 'Livreur arrivé au magasin/point de collecte'
        });

        await order.save({ session });
        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'Statut mis à jour: En cours d\'achats.',
            order
        });

        // Background: Push Notification
        try {
            const client = await Client.findById(order.clientId).select('pushToken notifications');
            if (client) {
                const title = 'Mise à jour de votre commande';
                const message = 'Votre livreur a commencé les achats.';

                // Persist notification
                client.notifications.push({
                    title,
                    message,
                    type: 'Order',
                    isRead: false,
                    createdAt: new Date()
                });
                await client.save();

                if (client.pushToken) {
                    await sendPushNotification(client.pushToken, title, message);
                }
            }
        } catch (pushErr) {
            console.error('[PUSH] Shopping notification failed:', pushErr);
        }
    } catch (error: any) {
        await session.abortTransaction();
        console.error('[LIVREUR_ORDERS] Shopping Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour.' });
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Mark order as picked up
 * @route   PATCH /api/livreur/orders/:id/pickup
 * @access  Private/Livreur
 */
export const markOrderPickedUp = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const livreurId = (req as any).user?.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'ID de commande invalide.' });
        }

        const order = await Order.findById(id).session(session);

        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Commande non trouvée.' });
        }

        // Verify order belongs to this livreur
        if (!order.livreurId || order.livreurId.toString() !== livreurId) {
            await session.abortTransaction();
            return res.status(403).json({ success: false, message: 'Cette commande ne vous est pas assignée.' });
        }

        // Allow transition from ASSIGNED or SHOPPING
        if (order.status !== 'ASSIGNED' && order.status !== 'SHOPPING') {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Impossible de marquer comme récupérée. Statut actuel: ${order.status}`
            });
        }

        // Update status
        order.status = 'PICKED_UP';
        order.timeline.push({
            status: 'PICKED_UP',
            timestamp: new Date(),
            actor: 'Livreur',
            note: 'Commande récupérée par le livreur'
        });

        await order.save({ session });
        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'Commande marquée comme récupérée.',
            order
        });

        // Background: Push Notification
        try {
            const client = await Client.findById(order.clientId).select('pushToken notifications');
            if (client) {
                const title = 'Commande en route';
                const message = 'Votre livreur a récupéré votre commande.';

                // Persist notification
                client.notifications.push({
                    title,
                    message,
                    type: 'Order',
                    isRead: false,
                    createdAt: new Date()
                });
                await client.save();

                if (client.pushToken) {
                    await sendPushNotification(client.pushToken, title, message);
                }
            }
        } catch (pushErr) {
            console.error('[PUSH] Pickup notification failed:', pushErr);
        }
    } catch (error: any) {
        await session.abortTransaction();
        console.error('[LIVREUR_ORDERS] Pickup Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour.' });
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Mark order as in transit
 * @route   PATCH /api/livreur/orders/:id/in-transit
 * @access  Private/Livreur
 */
export const markOrderInTransit = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const livreurId = (req as any).user?.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'ID de commande invalide.' });
        }

        const order = await Order.findById(id).session(session);

        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Commande non trouvée.' });
        }

        // Verify order belongs to this livreur and is in PICKED_UP status
        if (!order.livreurId || order.livreurId.toString() !== livreurId) {
            await session.abortTransaction();
            return res.status(403).json({ success: false, message: 'Cette commande ne vous est pas assignée.' });
        }

        if (order.status !== 'PICKED_UP') {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Impossible de marquer en transit. Statut actuel: ${order.status}`
            });
        }

        // Update status
        order.status = 'IN_TRANSIT';
        order.timeline.push({
            status: 'IN_TRANSIT',
            timestamp: new Date(),
            actor: 'Livreur',
            note: 'Livraison en cours'
        });

        await order.save({ session });
        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'Commande marquée en transit.',
            order
        });

        // Background: Push Notification
        try {
            const client = await Client.findById(order.clientId).select('pushToken notifications');
            if (client) {
                const title = 'Livraison en cours';
                const message = 'Votre livreur arrive à votre destination.';

                // Persist notification
                client.notifications.push({
                    title,
                    message,
                    type: 'Order',
                    isRead: false,
                    createdAt: new Date()
                });
                await client.save();

                if (client.pushToken) {
                    await sendPushNotification(client.pushToken, title, message);
                }
            }
        } catch (pushErr) {
            console.error('[PUSH] In-transit notification failed:', pushErr);
        }
    } catch (error: any) {
        await session.abortTransaction();
        console.error('[LIVREUR_ORDERS] In-Transit Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour.' });
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Complete order delivery with proof
 * @route   POST /api/livreur/orders/:id/deliver
 * @access  Private/Livreur
 */
export const deliverOrder = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const livreurId = (req as any).user?.id;
        const { photos, signature, notes, otp } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'ID de commande invalide.' });
        }

        // Validate proof of delivery
        if (!photos || photos.length === 0) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Au moins une photo est requise.' });
        }

        const order = await Order.findById(id).session(session);

        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Commande non trouvée.' });
        }

        // Verify order belongs to this livreur
        if (!order.livreurId || order.livreurId.toString() !== livreurId) {
            await session.abortTransaction();
            return res.status(403).json({ success: false, message: 'Cette commande ne vous est pas assignée.' });
        }

        // Verify order is in valid status for delivery
        if (order.status !== 'IN_TRANSIT' && order.status !== 'PICKED_UP') {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Impossible de livrer. Statut actuel: ${order.status}`
            });
        }

        // Update order with proof of delivery
        order.proofOfDelivery = {
            photos,
            signature,
            notes,
            otp,
            timestamp: new Date()
        };

        order.status = 'DELIVERED';
        order.timeline.push({
            status: 'DELIVERED',
            timestamp: new Date(),
            actor: 'Livreur',
            note: notes || 'Commande livrée avec succès'
        });

        await order.save({ session });

        // Credit livreur wallet using the WalletService for transaction consistency
        const walletResult = await walletService.creditWalletForOrder(id, session);
        if (!walletResult.success) {
            throw new Error(walletResult.message || 'Erreur lors du crédit du portefeuille.');
        }

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'Commande livrée avec succès! Vos gains ont été crédités.',
            order,
            earnings: order.pricing.livreurNet
        });

        // Background: Push Notification
        try {
            const client = await Client.findById(order.clientId).select('pushToken notifications');
            if (client) {
                const title = 'Commande livrée 🏁';
                const message = 'Merci d\'avoir choisi SALA ! Votre commande est arrivée.';

                // Persist notification
                client.notifications.push({
                    title,
                    message,
                    type: 'Order',
                    isRead: false,
                    createdAt: new Date()
                });
                await client.save();

                if (client.pushToken) {
                    await sendPushNotification(client.pushToken, title, message);
                }
            }
        } catch (pushErr) {
            console.error('[PUSH] Delivery notification failed:', pushErr);
        }
    } catch (error: any) {
        await session.abortTransaction();
        console.error('[LIVREUR_ORDERS] Deliver Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la livraison.' });
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Cancel an accepted order
 * @route   POST /api/livreur/orders/:id/cancel
 * @access  Private/Livreur
 */
export const cancelOrder = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const livreurId = (req as any).user?.id;
        const { reason, details } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'ID de commande invalide.' });
        }

        if (!reason) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Raison d\'annulation requise.' });
        }

        const order = await Order.findById(id).session(session);

        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Commande non trouvée.' });
        }

        // Verify order belongs to this livreur
        if (!order.livreurId || order.livreurId.toString() !== livreurId) {
            await session.abortTransaction();
            return res.status(403).json({ success: false, message: 'Cette commande ne vous est pas assignée.' });
        }

        // Can't cancel delivered orders
        if (order.status === 'DELIVERED') {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Impossible d\'annuler une commande déjà livrée.' });
        }

        // Calculate penalty (example: 10 MAD for cancellations after pickup)
        let penalty = 0;
        if (order.status === 'PICKED_UP' || order.status === 'IN_TRANSIT') {
            penalty = 10; // 10 MAD (DH)
        }

        // Update order
        order.cancellation = {
            reason,
            details,
            penalty,
            cancelledBy: 'livreur',
            timestamp: new Date()
        };

        order.status = 'CANCELLED_CLIENT'; // Using existng enum value (since CANCELLED_LIVREUR not available in enum yet, or reuse CLIENT/ADMIN)
        // Wait, checking enum status map... status can be CANCELLED_CLIENT, CANCELLED_ADMIN.
        // Let's stick to 'CANCELLED_ADMIN' as it's closer to internal concellation than client self-cancellation.
        order.status = 'CANCELLED_ADMIN';
        order.livreurId = undefined; // Unassign livreur

        order.timeline.push({
            status: 'CANCELLED_ADMIN',
            timestamp: new Date(),
            actor: 'Livreur',
            note: `Annulée par livreur: ${reason}${details ? ' - ' + details : ''}`
        });

        await order.save({ session });

        // Apply penalty if any using WalletService for consistency
        if (penalty > 0) {
            const walletResult = await walletService.deductPenaltyForOrder(id, livreurId, penalty, session);
            if (!walletResult.success) {
                throw new Error(walletResult.message || 'Erreur lors de l\'application de la pénalité.');
            }
        }

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'Commande annulée.',
            penalty: penalty > 0 ? penalty : 0,
            order
        });
    } catch (error: any) {
        await session.abortTransaction();
        console.error('[LIVREUR_ORDERS] Cancel Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de l\'annulation.' });
    } finally {
        session.endSession();
    }
};
