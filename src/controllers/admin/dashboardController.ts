import { Request, Response } from 'express';
import Order from '../../models/Order';
import Client from '../../models/Client';
import Livreur from '../../models/Livreur';

/**
 * @desc    Get high-level statistics for dashboard
 */
export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const totalDeliveries = await Order.countDocuments({ status: 'DELIVERED' });
        const activeClients = await Client.countDocuments({ status: 'Active' });
        const cities = await Client.distinct('city');
        const totalCities = cities.length;
        const pendingDisputes = await Order.countDocuments({
            status: { $in: ['CANCELLED_CLIENT', 'CANCELLED_ADMIN'] }
        });
        const totalRevenueResult = await Order.aggregate([
            { $match: { paymentStatus: 'Captured' } },
            { $group: { _id: null, total: { $sum: '$pricing.total' } } }
        ]);
        const totalRevenue = totalRevenueResult[0]?.total || 0;
        const avgRating = 4.8;

        res.status(200).json({
            success: true,
            stats: {
                totalDeliveries,
                activeClients,
                totalCities,
                avgRating,
                totalRevenue,
                pendingDisputes
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

/**
 * @desc    Get financial analytics
 */
export const getDashboardAnalytics = async (req: Request, res: Response) => {
    try {
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);

            const dayData = await Order.aggregate([
                { $match: { createdAt: { $gte: date, $lt: nextDay }, paymentStatus: 'Captured' } },
                { $group: { _id: null, revenue: { $sum: '$pricing.total' }, payouts: { $sum: '$pricing.livreurNet' }, margin: { $sum: '$pricing.platformMargin' } } }
            ]);

            last7Days.push({
                date: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
                revenue: dayData[0]?.revenue || 0,
                payouts: dayData[0]?.payouts || 0,
                margin: dayData[0]?.margin || 0
            });
        }
        res.status(200).json({ success: true, analytics: last7Days });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

/**
 * @desc    Get real-time fleet
 */
export const getDashboardFleet = async (req: Request, res: Response) => {
    try {
        const onlineLivreurs = await Livreur.find({ isOnline: true }).select('name phoneNumber lastLocation status vehicle').lean();
        const activeOrders = await Order.find({ status: { $in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] } }).select('livreurId pickupLocation dropoffLocation status').lean();
        res.status(200).json({ success: true, fleet: onlineLivreurs, activeOrders });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

/**
 * @desc    Get recent activity feed
 */
export const getRecentActivity = async (req: Request, res: Response) => {
    try {
        const recentOrders = await Order.find({}).sort({ updatedAt: -1 }).limit(10).populate('clientId', 'name').lean();
        const activity = recentOrders.map(o => ({
            id: o._id,
            type: 'ORDER_UPDATE',
            message: `Commande #${o._id.toString().substring(18)} mise à jour vers ${o.status}`,
            time: o.updatedAt,
            user: (o.clientId as any)?.name || 'Client'
        }));
        res.status(200).json({ success: true, activity });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
