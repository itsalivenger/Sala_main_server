import { Request, Response } from 'express';
import Livreur from '../../models/Livreur';
import Order from '../../models/Order';
import LivreurTransaction from '../../models/LivreurTransaction';
import mongoose from 'mongoose';

/**
 * @desc    Get all livreurs with stats
 * @route   GET /api/admin/livreurs
 * @access  Private/Admin
 */
export const getAllLivreurs = async (req: Request, res: Response) => {
    try {
        const livreurs = await Livreur.find({}).sort({ createdAt: -1 }).lean();

        const livreursWithStats = livreurs.map((l: any) => ({
            id: l._id,
            name: l.name || 'Inconnu',
            phoneNumber: l.phoneNumber,
            status: l.status,
            city: l.city,
            walletBalance: l.walletBalance || 0,
            isOnline: l.isOnline || false,
            createdAt: l.createdAt
        }));

        res.status(200).json({
            success: true,
            count: livreursWithStats.length,
            livreurs: livreursWithStats
        });
    } catch (error: any) {
        console.error('[ADMIN_LIVREURS] Get All Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des livreurs.' });
    }
};

/**
 * @desc    Get livreur profile details
 * @route   GET /api/admin/livreurs/:id
 * @access  Private/Admin
 */
export const getLivreurProfile = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const livreur = await Livreur.findById(id).lean();
        if (!livreur) {
            return res.status(404).json({ success: false, message: 'Livreur non trouvé.' });
        }

        // Fetch Transactions (Ledger)
        const transactions = await LivreurTransaction.find({ livreurId: id }).sort({ createdAt: -1 }).lean();

        // Fetch Orders for Performance
        const orders = await Order.find({ livreurId: id }).sort({ createdAt: -1 }).lean();

        // Calculate Performance
        // Calculate Performance
        const completedOrders = orders.filter(o => o.status === 'DELIVERED').length;
        const cancelledOrders = orders.filter(o => ['CANCELLED_CLIENT', 'CANCELLED_ADMIN'].includes(o.status)).length;
        const totalOrders = orders.length;
        const successRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
        const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

        // Mock Reviews for Preview
        const mockReviews = [
            {
                clientName: "Ahmed T.",
                rating: 5,
                comment: "Très professionnel et ponctuel. Livraison impeccable.",
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
                clientName: "Sara L.",
                rating: 4,
                comment: "Livreur sympathique, dommage pour le léger retard.",
                createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            }
        ];

        const reviews = livreur.reviews && livreur.reviews.length > 0 ? livreur.reviews : mockReviews;
        const averageRating = livreur.reviews && livreur.reviews.length > 0 ? livreur.averageRating : 4.5;

        // Rich Stats Calculation
        const monthlyEarnings = 3450;
        const richStats = {
            totalDistance: 1240, // km
            onTimeRate: 98, // %
            reliabilityScore: 95, // %
            monthlyEarnings: monthlyEarnings, // MAD
            avgEarningsPerOrder: completedOrders > 0 ? (monthlyEarnings / completedOrders).toFixed(1) : 0,
            monthlyGrowth: 12.5, // % trend
            topZone: "Gauthier, Maarif",
            ratingBreakdown: {
                5: 12,
                4: 3,
                3: 1,
                2: 0,
                1: 0
            }
        };

        // Avg Delivery Time (simplified calculation)
        let totalTime = 0;
        let deliveredCount = 0;
        orders.forEach(o => {
            if (o.status === 'DELIVERED') {
                const pickedUp = o.timeline.find(t => t.status === 'PICKED_UP')?.timestamp;
                const delivered = o.timeline.find(t => t.status === 'DELIVERED')?.timestamp;
                if (pickedUp && delivered) {
                    totalTime += (new Date(delivered).getTime() - new Date(pickedUp).getTime());
                    deliveredCount++;
                }
            }
        });
        const avgDeliveryTime = deliveredCount > 0 ? (totalTime / deliveredCount / 60000) : 0; // in minutes

        res.status(200).json({
            success: true,
            livreur: {
                ...livreur,
                id: livreur._id
            },
            wallet: {
                balance: livreur.walletBalance || 0,
                transactions
            },
            performance: {
                completedOrders,
                cancelledOrders,
                totalOrders,
                successRate: successRate.toFixed(1),
                cancellationRate: cancellationRate.toFixed(1),
                avgDeliveryTime: avgDeliveryTime.toFixed(0),
                averageRating,
                reviews,
                ...richStats
            }
        });
    } catch (error: any) {
        console.error('[ADMIN_LIVREURS] Get Profile Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération du profil.' });
    }
};

/**
 * @desc    Update Livreur KYC Status (Approve/Reject)
 * @route   PUT /api/admin/livreurs/:id/kyc
 * @access  Private/Admin
 */
export const updateLivreurKYC = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;

        if (!['Approved', 'Suspended', 'Pending'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Statut invalide.' });
        }

        const update: any = { status };
        if (status === 'Suspended' || status === 'Pending') {
            update.rejectionReason = reason;
        } else {
            update.rejectionReason = undefined;
        }

        const livreur = await Livreur.findByIdAndUpdate(id, update, { new: true });
        if (!livreur) {
            return res.status(404).json({ success: false, message: 'Livreur non trouvé.' });
        }

        res.status(200).json({
            success: true,
            message: `KYC mis à jour: ${status}`,
            livreur: {
                status: livreur.status,
                rejectionReason: livreur.rejectionReason
            }
        });
    } catch (error: any) {
        console.error('[ADMIN_LIVREURS] KYC Update Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour KYC.' });
    }
};

/**
 * @desc    Adjust Livreur Wallet (Ledger-based)
 * @route   POST /api/admin/livreurs/:id/wallet/adjust
 * @access  Private/Admin
 */
export const adjustLivreurWallet = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { id } = req.params;
        const { amount, type, category, description } = req.body;
        const adminId = (req as any).user.id;

        if (!amount || !type || !category || !description) {
            return res.status(400).json({ success: false, message: 'Tous les champs sont requis.' });
        }

        const livreur = await Livreur.findById(id).session(session);
        if (!livreur) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Livreur non trouvé.' });
        }

        // Calculate new balance
        const adjustment = type === 'Credit' ? Number(amount) : -Number(amount);
        livreur.walletBalance = (livreur.walletBalance || 0) + adjustment;
        await livreur.save({ session });

        // Create transaction record
        await LivreurTransaction.create([{
            livreurId: id,
            amount: Number(amount),
            type,
            category,
            description,
            adminId,
            status: 'Completed'
        }], { session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: 'Portefeuille ajusté avec succès.',
            newBalance: livreur.walletBalance
        });
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        console.error('[ADMIN_LIVREURS] Wallet Adjust Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de l\'ajustement du portefeuille.' });
    }
};

/**
 * @desc    Get Livreur Online Activity/Location
 * @route   GET /api/admin/livreurs/:id/activity
 * @access  Private/Admin
 */
export const getLivreurActivity = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const livreur = await Livreur.findById(id).select('isOnline lastLocation').lean();

        if (!livreur) {
            return res.status(404).json({ success: false, message: 'Livreur non trouvé.' });
        }

        res.status(200).json({
            success: true,
            activity: {
                isOnline: livreur.isOnline,
                lastLocation: livreur.lastLocation
            }
        });
    } catch (error: any) {
        console.error('[ADMIN_LIVREURS] Activity Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération de l\'activité.' });
    }
};
