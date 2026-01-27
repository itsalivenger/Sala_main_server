import { Request, Response } from 'express';
import Order from '../../models/Order';
import Livreur from '../../models/Livreur';
import mongoose from 'mongoose';

/**
 * @desc    Get performance statistics for the authenticated livreur
 * @route   GET /api/livreur/performance
 * @access  Private/Livreur
 */
export const getPerformanceStats = async (req: Request, res: Response) => {
    try {
        const livreurId = (req as any).user?.id;
        if (!livreurId) {
            return res.status(401).json({ success: false, message: 'Non autorisé.' });
        }

        // 1. Get Livreur Profile Data (Rating, Reviews)
        const livreur = await Livreur.findById(livreurId).select('averageRating reviews createdAt isOnline');
        if (!livreur) {
            return res.status(404).json({ success: false, message: 'Livreur non trouvé.' });
        }

        // 2. Aggregate Order Data (Earnings, Distance, Count)
        const stats = await Order.aggregate([
            {
                $match: {
                    livreurId: new mongoose.Types.ObjectId(livreurId),
                    status: { $in: ['DELIVERED', 'COMPLETED'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalEarnings: { $sum: '$pricing.livreurNet' },
                    totalDistance: { $sum: '$distance' },
                    completedOrders: { $sum: 1 }
                }
            }
        ]);

        const result = stats[0] || {
            totalEarnings: 0,
            totalDistance: 0,
            completedOrders: 0
        };

        // Format recent reviews
        // Sort by date desc and take last 5
        const recentReviews = (livreur.reviews || [])
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);

        res.status(200).json({
            success: true,
            data: {
                totalEarnings: parseFloat((result.totalEarnings || 0).toFixed(2)),
                totalDistance: parseFloat((result.totalDistance || 0).toFixed(2)),
                completedOrders: result.completedOrders || 0,
                averageRating: parseFloat((livreur.averageRating || 0).toFixed(1)),
                onlineStatus: livreur.isOnline,
                memberSince: livreur.createdAt,
                recentReviews
            }
        });

    } catch (error: any) {
        console.error('[LIVREUR_PERFORMANCE] Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques.' });
    }
};
