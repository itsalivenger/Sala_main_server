import { Request, Response } from 'express';
import Livreur from '../../models/Livreur';
import Order from '../../models/Order';
import mongoose from 'mongoose';
import walletService from '../../services/walletService';
import Wallet from '../../models/Wallet';
import WalletTransaction from '../../models/WalletTransaction';

/**
 * @desc    Get all livreurs with stats
 * @route   GET /api/admin/livreurs
 * @access  Private/Admin
 */
export const getAllLivreurs = async (req: Request, res: Response) => {
    try {
        const livreurs = await Livreur.find({}).sort({ createdAt: -1 }).lean();

        // Fetch active orders to count per livreur
        const activeOrders = await Order.find({
            status: { $in: ['ASSIGNED', 'SHOPPING', 'PICKED_UP', 'IN_TRANSIT'] }
        }).select('livreurId').lean();

        const activeCounts: Record<string, number> = {};
        activeOrders.forEach(o => {
            if (o.livreurId) {
                const id = o.livreurId.toString();
                activeCounts[id] = (activeCounts[id] || 0) + 1;
            }
        });

        const livreursWithStats = livreurs.map((l: any) => ({
            id: l._id,
            name: l.name || 'Inconnu',
            phoneNumber: l.phoneNumber,
            email: l.email,
            status: l.status,
            city: l.city,
            walletBalance: l.walletBalance || 0,
            isOnline: l.isOnline || false,
            activeOrdersCount: activeCounts[l._id.toString()] || 0, // Added count
            createdAt: l.createdAt
        }));

        res.status(200).json({
            success: true,
            totalActiveOrders: activeOrders.length, // Total active in the platform
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

        // Helper for status checks - Extremely robust
        const normalize = (s: any) => String(s || '').trim().toUpperCase();
        const isCompleted = (s: string) => ['DELIVERED', 'COMPLETED', 'DELIVERED_CLIENT'].includes(normalize(s));
        const isCancelled = (s: string) => normalize(s).startsWith('CANCELLED');

        // Fetch Wallet & Transactions (Source of truth)
        const wallet = await Wallet.findOne({ livreurId: id }).lean();
        let transactions: any[] = [];
        if (wallet) {
            transactions = await WalletTransaction.find({
                walletId: wallet._id
            }).sort({ createdAt: -1 }).limit(50).lean();
        }

        // Fetch Orders for Performance - Robust query
        const orders = await Order.find({
            $or: [
                { livreurId: id },
                { livreurId: new mongoose.Types.ObjectId(id) }
            ]
        })
            .populate('clientId', 'name')
            .sort({ createdAt: -1 })
            .lean();

        // Calculate Performance
        const completedOrders = orders.filter(o => isCompleted(o.status)).length;
        const cancelledOrders = orders.filter(o => isCancelled(o.status)).length;
        const totalOrders = orders.length;
        const successRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
        const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

        // Financial & Growth Stats
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        // Current Month Earnings
        const currentMonthOrders = orders.filter(o =>
            isCompleted(o.status) &&
            new Date(o.createdAt) >= thirtyDaysAgo
        );
        const monthlyEarnings = currentMonthOrders.reduce((acc, o) => acc + (Number(o.pricing?.livreurNet) || 0), 0);

        // Previous Month Earnings (for growth calc)
        const previousMonthOrders = orders.filter(o =>
            isCompleted(o.status) &&
            new Date(o.createdAt) >= sixtyDaysAgo &&
            new Date(o.createdAt) < thirtyDaysAgo
        );
        const previousMonthEarnings = previousMonthOrders.reduce((acc, o) => acc + (Number(o.pricing?.livreurNet) || 0), 0);

        let monthlyGrowth = 0;
        if (previousMonthEarnings > 0) {
            monthlyGrowth = ((monthlyEarnings - previousMonthEarnings) / previousMonthEarnings) * 100;
        } else if (monthlyEarnings > 0) {
            monthlyGrowth = 100;
        }

        // Total Bonus (Adjustments)
        const totalBonus = transactions.reduce((acc: number, t: any) => {
            const cat = normalize(t.category);
            const type = normalize(t.type);
            const desc = (t.description || '').toLowerCase();

            const isAdjustment = cat === 'ADJUSTMENT' || cat === 'BONUS' || cat === 'REWARD';
            const isBonusDesc = desc.includes('bonus') || desc.includes('prime') || desc.includes('gratification');

            if (type === 'CREDIT' && (isAdjustment || isBonusDesc)) {
                return acc + (Number(t.amount) || 0);
            }
            return acc;
        }, 0);

        // Total Distance & Lifetime Earnings
        let totalDistance = 0;
        let lifetimeEarnings = 0;

        orders.forEach(o => {
            if (isCompleted(o.status)) {
                if (o.distance) totalDistance += Number(o.distance);
                if (o.pricing?.livreurNet) lifetimeEarnings += Number(o.pricing.livreurNet);
            }
        });

        // Top Zone (Most frequent pickup address)
        const zoneCounts: Record<string, number> = {};
        orders.forEach(o => {
            if (isCompleted(o.status) && o.pickupLocation?.address) {
                const zone = o.pickupLocation.address;
                zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
            }
        });

        let topZone = "N/A";
        let maxZoneCount = 0;
        for (const [zone, count] of Object.entries(zoneCounts)) {
            if (count > maxZoneCount) {
                maxZoneCount = count;
                topZone = zone;
            }
        }
        if (topZone.length > 25) topZone = topZone.substring(0, 25) + '...';

        const reviews = livreur.reviews && livreur.reviews.length > 0 ? livreur.reviews : [];
        const averageRating = livreur.averageRating || 0;

        // Calculate Rating Breakdown dynamically
        const ratingBreakdown: Record<string, number> = {
            '5': 0, '4': 0, '3': 0, '2': 0, '1': 0
        };

        if (Array.isArray(reviews)) {
            reviews.forEach((r: any) => {
                const rating = Math.round(Number(r.rating));
                if (rating >= 1 && rating <= 5) {
                    ratingBreakdown[String(rating)]++;
                }
            });
        }

        // Calculate On-Time Rate & Reliability Score
        let onTimeOrders = 0;
        let deliveredWithTimeline = 0;
        let cancelledByLivreur = orders.filter(o => o.status === 'CANCELLED_ADMIN' && o.cancellation?.cancelledBy === 'livreur').length;

        orders.forEach(o => {
            if (isCompleted(o.status)) {
                const pickupEvent = o.timeline?.find((t: any) => t.status === 'PICKED_UP');
                const deliveredEvent = o.timeline?.find((t: any) => t.status === 'DELIVERED' || t.status === 'COMPLETED');

                if (pickupEvent && deliveredEvent) {
                    deliveredWithTimeline++;
                    const diffMins = (new Date(deliveredEvent.timestamp).getTime() - new Date(pickupEvent.timestamp).getTime()) / (1000 * 60);
                    if (diffMins <= 45) { // 45 minutes threshold
                        onTimeOrders++;
                    }
                }
            }
        });

        const onTimeRate = deliveredWithTimeline > 0 ? (onTimeOrders / deliveredWithTimeline) * 100 : 100; // Default to 100% if no data
        const reliabilityScore = (completedOrders + cancelledByLivreur) > 0
            ? (completedOrders / (completedOrders + cancelledByLivreur)) * 100
            : 100;

        // Rich Stats Calculation
        const richStats = {
            totalDistance: parseFloat(totalDistance.toFixed(1)),
            onTimeRate: Math.round(onTimeRate),
            reliabilityScore: Math.round(reliabilityScore),
            monthlyEarnings,
            totalBonus,
            avgEarningsPerOrder: completedOrders > 0 ? (lifetimeEarnings / completedOrders).toFixed(1) : 0,
            monthlyGrowth: parseFloat(monthlyGrowth.toFixed(1)),
            topZone,
            ratingBreakdown
        };

        // Avg Delivery Time (simplified calculation)
        let totalTime = 0;
        let deliveredCount = 0;
        orders.forEach(o => {
            if (isCompleted(o.status)) {
                const pickedUp = o.timeline.find(t => t.status === 'PICKED_UP')?.timestamp;
                const delivered = o.timeline.find(t => t.status === 'DELIVERED' || t.status === 'COMPLETED' || t.status.toUpperCase() === 'DELIVERED_CLIENT')?.timestamp;
                if (pickedUp && delivered) {
                    totalTime += (new Date(delivered).getTime() - new Date(pickedUp).getTime());
                    deliveredCount++;
                }
            }
        });
        const avgDeliveryTime = deliveredCount > 0 ? (totalTime / deliveredCount / 60000) : 0; // in minutes

        // Active Orders
        const activeOrders = orders.filter(o =>
            ['ASSIGNED', 'SHOPPING', 'PICKED_UP', 'IN_TRANSIT'].includes(normalize(o.status))
        ).map(o => ({
            id: o._id,
            orderId: o.orderId,
            status: o.status,
            customerName: (o.clientId as any)?.name || 'Client',
            pickup: o.pickupLocation?.address,
            dropoff: o.dropoffLocation?.address,
            amount: o.pricing?.total,
            createdAt: o.createdAt
        }));

        res.status(200).json({
            success: true,
            livreur: {
                ...livreur,
                id: livreur._id
            },
            activeOrders,
            wallet: {
                balance: wallet?.balance || livreur.walletBalance || 0,
                transactions: transactions.map(t => ({
                    id: t._id,
                    amount: t.amount,
                    type: t.type === 'TOP_UP' || t.type === 'ORDER_PAYOUT' || (t.amount > 0) ? 'Credit' : 'Debit',
                    category: t.type,
                    description: t.description,
                    createdAt: t.createdAt
                }))
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

        const wallet = await walletService.getOrCreateWallet(id, session);

        // Calculate new balance
        const adjustment = type === 'Credit' ? Number(amount) : -Number(amount);
        wallet.balance = parseFloat((wallet.balance + adjustment).toFixed(2));
        await wallet.save({ session });

        // Sync with Livreur model
        livreur.walletBalance = wallet.balance;
        await livreur.save({ session });

        // Create transaction record
        await WalletTransaction.create([{
            walletId: wallet._id,
            amount: adjustment,
            type: type === 'Credit' ? 'TOP_UP' : 'WITHDRAWAL', // Using enums from TransactionType
            referenceType: 'Admin',
            referenceId: new mongoose.Types.ObjectId(adminId),
            description: `[ADMIN] ${category}: ${description}`,
        }], { session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: 'Portefeuille ajusté avec succès.',
            newBalance: wallet.balance
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

/**
 * @desc    Permanently delete livreur and associated data
 * @route   DELETE /api/admin/livreurs/:id
 * @access  Private/Admin
 */
export const deleteLivreur = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { id } = req.params;

        const livreur = await Livreur.findById(id).session(session);
        if (!livreur) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Livreur non trouvé.' });
        }

        // 1. Find and Delete Wallet & Transactions
        const Wallet = mongoose.model('Wallet');
        const Transaction = mongoose.model('WalletTransaction');

        const wallet = await Wallet.findOne({ livreurId: id }).session(session);
        if (wallet) {
            await Transaction.deleteMany({ walletId: wallet._id }).session(session);
            await Wallet.findByIdAndDelete(wallet._id).session(session);
        }

        // 2. Disconnect Orders (Set livreurId to null)
        await Order.updateMany({ livreurId: id }, { $set: { livreurId: null } }).session(session);

        // 3. Delete Livreur
        await Livreur.findByIdAndDelete(id).session(session);

        await session.commitTransaction();
        res.status(200).json({
            success: true,
            message: 'Livreur et ses données financières supprimés. Les commandes ont été dissociées.'
        });
    } catch (error: any) {
        await session.abortTransaction();
        console.error('[ADMIN_LIVREURS] Delete Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la suppression du livreur.' });
    } finally {
        session.endSession();
    }
};
