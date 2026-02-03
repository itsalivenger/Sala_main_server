import Order from '../models/Order';
import mongoose from 'mongoose';

/**
 * Service to automatically expand order visibility if not accepted within a certain timeframe.
 * If an order stays in 'SEARCHING_FOR_LIVREUR' for more than EXPIRY_MINUTES,
 * the 'eligibleLivreurs' list is cleared, making it visible to all available drivers.
 */

const STAGE_1_MINUTES = 2; // Expand to 10 closest after 2 minutes
const STAGE_2_MINUTES = 5; // Expand to ALL after 5 minutes
const CHECK_INTERVAL_MS = 60 * 1000; // Run check every minute

export const startOrderExpansionJob = () => {
    console.log(`[OrderExpansion] Starting background job... (Checking every ${CHECK_INTERVAL_MS / 1000}s)`);

    setInterval(async () => {
        try {
            const now = new Date();
            const stage1Cutoff = new Date(now.getTime() - STAGE_1_MINUTES * 60 * 1000);
            const stage2Cutoff = new Date(now.getTime() - STAGE_2_MINUTES * 60 * 1000);

            // --- PHASE 1: Expand Stage 0 to Stage 1 (Top 10) ---
            const ordersToStage1 = await Order.find({
                status: 'SEARCHING_FOR_LIVREUR',
                expansionStage: 0,
                createdAt: { $lt: stage1Cutoff }
            });

            for (const order of ordersToStage1) {
                console.log(`[OrderExpansion] Expanding Order ${order._id} to Stage 1 (Top 10 drivers)`);

                // Use the same logic as controller but with limit 10
                // We need to import getClosestLivreurs or re-implement it here.
                // Re-calculating helps in case drivers moved.
                const top10Ids = await getTopDrivers(order.pickupLocation!, 10);

                await Order.updateOne(
                    { _id: order._id },
                    {
                        $set: {
                            eligibleLivreurs: top10Ids,
                            expansionStage: 1
                        },
                        $push: {
                            timeline: {
                                status: 'SEARCHING_FOR_LIVREUR',
                                timestamp: new Date(),
                                actor: 'System',
                                note: 'Visibilité étendue aux 10 livreurs les plus proches.'
                            }
                        }
                    }
                );
            }

            // --- PHASE 2: Expand Stage 1 to Stage 2 (Public) ---
            const ordersToStage2 = await Order.find({
                status: 'SEARCHING_FOR_LIVREUR',
                expansionStage: 1,
                createdAt: { $lt: stage2Cutoff }
            });

            for (const order of ordersToStage2) {
                console.log(`[OrderExpansion] Expanding Order ${order._id} to Stage 2 (Public)`);

                await Order.updateOne(
                    { _id: order._id },
                    {
                        $set: {
                            eligibleLivreurs: [],
                            expansionStage: 2
                        },
                        $push: {
                            timeline: {
                                status: 'SEARCHING_FOR_LIVREUR',
                                timestamp: new Date(),
                                actor: 'System',
                                note: 'Visibilité étendue à tous les livreurs disponibles.'
                            }
                        }
                    }
                );
            }

        } catch (error) {
            console.error('[OrderExpansion] Error in expansion job:', error);
        }
    }, CHECK_INTERVAL_MS);
};

/**
 * Re-implementation of closest drivers logic for the background job
 */
const getTopDrivers = async (pickupLocation: { lat: number, lng: number }, limit: number) => {
    try {
        const Order = mongoose.model('Order');
        const Livreur = mongoose.model('Livreur');
        const { getHaversineDistance } = require('../utils/routingUtils');

        const busyLivreurs = await Order.find({
            status: { $in: ['ASSIGNED', 'SHOPPING', 'PICKED_UP', 'IN_TRANSIT'] },
            livreurId: { $exists: true }
        }).distinct('livreurId');

        const availableLivreurs = await Livreur.find({
            isOnline: true,
            status: 'Approved',
            _id: { $nin: busyLivreurs },
            'lastLocation.lat': { $exists: true },
            'lastLocation.lng': { $exists: true }
        }).select('_id lastLocation');

        const rankedLivreurs = availableLivreurs
            .map((livreur: any) => {
                const distance = getHaversineDistance(
                    pickupLocation.lat,
                    pickupLocation.lng,
                    livreur.lastLocation!.lat,
                    livreur.lastLocation!.lng
                );
                return { id: livreur._id, distance };
            })
            .sort((a, b) => a.distance - b.distance)
            .slice(0, limit);

        return rankedLivreurs.map(r => r.id);
    } catch (error) {
        console.error('[OrderExpansion] Error finding top drivers:', error);
        return [];
    }
};
