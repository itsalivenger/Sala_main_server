import Order from '../models/Order';
import mongoose from 'mongoose';

/**
 * Service to automatically expand order visibility if not accepted within a certain timeframe.
 * If an order stays in 'SEARCHING_FOR_LIVREUR' for more than EXPIRY_MINUTES,
 * the 'eligibleLivreurs' list is cleared, making it visible to all available drivers.
 */

const EXPIRY_MINUTES = 5; // Configurable wait time
const CHECK_INTERVAL_MS = 60 * 1000; // Run check every minute

export const startOrderExpansionJob = () => {
    console.log(`[OrderExpansion] Starting background job... (Checking every ${CHECK_INTERVAL_MS / 1000}s)`);

    setInterval(async () => {
        try {
            const cutoffTime = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000);

            // Find orders created before cutoff that still have restricted visibility
            const ordersToExpand = await Order.find({
                status: 'SEARCHING_FOR_LIVREUR',
                eligibleLivreurs: { $exists: true, $not: { $size: 0 } },
                createdAt: { $lt: cutoffTime }
            });

            if (ordersToExpand.length > 0) {
                console.log(`[OrderExpansion] Found ${ordersToExpand.length} orders to expand for all drivers.`);

                const orderIds = ordersToExpand.map(o => o._id);

                const result = await Order.updateMany(
                    { _id: { $in: orderIds } },
                    {
                        $set: { eligibleLivreurs: [] },
                        $push: {
                            timeline: {
                                status: 'SEARCHING_FOR_LIVREUR',
                                timestamp: new Date(),
                                actor: 'System',
                                note: 'Visibilité étendue à tous les livreurs (Délai de recommandation dépassé).'
                            }
                        }
                    }
                );

                console.log(`[OrderExpansion] Successfully expanded ${result.modifiedCount} orders.`);
            }
        } catch (error) {
            console.error('[OrderExpansion] Error in expansion job:', error);
        }
    }, CHECK_INTERVAL_MS);
};
