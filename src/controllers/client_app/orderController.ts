import { Request, Response } from 'express';
import Order from '../../models/Order';
import Livreur from '../../models/Livreur';
import Client from '../../models/Client';
import Product from '../../models/Product';
import PlatformSettings from '../../models/PlatformSettings';
import mongoose from 'mongoose';
import { sendPushNotification } from '../../services/notificationService';
import { getRoadDistance, getHaversineDistance } from '../../utils/routingUtils';

// Logic moved into calculateOrderPricing with PlatformSettings lookup

// Haversine helper removed from here as it's now in routingUtils.ts.

/**
 * Find the closest online and available livreurs
 */
const getClosestLivreurs = async (pickupLocation: { lat: number, lng: number }, limit: number = 3) => {
    try {
        // 1. Find livreurs who are currently assigned to active orders to exclude them
        const busyLivreurs = await Order.find({
            status: { $in: ['ASSIGNED', 'SHOPPING', 'PICKED_UP', 'IN_TRANSIT'] },
            livreurId: { $exists: true }
        }).distinct('livreurId');

        // 2. Query for online, approved livreurs who are not busy
        const availableLivreurs = await Livreur.find({
            isOnline: true,
            status: 'Approved',
            _id: { $nin: busyLivreurs },
            'lastLocation.lat': { $exists: true },
            'lastLocation.lng': { $exists: true }
        }).select('_id lastLocation name');

        // 3. Calculate distances and sort (Using Haversine for initial ranking to avoid too many API calls)
        const rankedLivreurs = availableLivreurs
            .map(livreur => {
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

        // Result logged only in error case or for critical debugging (removed for production feel)
        return rankedLivreurs.map(r => r.id);
    } catch (error) {
        console.error('[OrderController] Error finding closest livreurs:', error);
        return [];
    }
};

/**
 * Helper to calculate order pricing
 */
export const calculateOrderPricing = async (items: any[], pickup?: any, dropoff?: any) => {
    const settings = await PlatformSettings.findOne();
    if (!settings) {
        throw new Error('Platform configuration missing. Please setup PlatformSettings in the database.');
    }

    const l = settings.livreur || {
        vehicle_limits: {
            bike: {},
            car: {},
            truck: {}
        }
    };
    const cSettings = settings.client || {};

    const marginPercent = (settings.platform_margin_percentage || 0) / 100;
    const taxRate = (settings.tax_percentage ?? 0) / 100;

    let subtotal = 0;
    let totalWeight = 0;
    let totalVolume = 0; // In m3

    // Fetch products to ensure we have dimensions if not provided
    const productIds = items.map(i => i._id);
    const products = await Product.find({ _id: { $in: productIds } });

    items.forEach(item => {
        subtotal += item.price * item.quantity;
        totalWeight += (item.unitWeight || 0) * item.quantity;

        // Try to get dimensions from item or from fetched product
        const product = products.find(p => p._id.toString() === (item._id || '').toString());
        const dimensions = item.dimensions || product?.dimensions;

        if (dimensions) {
            const itemVol = (dimensions.length * dimensions.width * dimensions.height) / 1000000;
            totalVolume += itemVol * item.quantity;
        }
    });

    // Determine Vehicle Type (for base price logic)
    // Uses the strict limits defined in vehicle_limits
    let vehicleType: 'bike' | 'car' | 'truck' = 'bike';

    // Check if Truck is needed (Exceeds Car limits)
    if (totalWeight > l.vehicle_limits.car.max_weight || totalVolume > l.vehicle_limits.car.max_volume) {
        vehicleType = 'truck';
    }
    // Check if Car is needed (Exceeds Bike limits)
    else if (totalWeight > l.vehicle_limits.bike.max_weight || totalVolume > l.vehicle_limits.bike.max_volume) {
        vehicleType = 'car';
    }
    // Default is bike if within limits

    // Determine Required Vehicle (for UI metadata)
    let requiredVehicle: 'moto' | 'small_car' | 'large_car' = 'moto';
    let vehicleTypeLabel = 'Livraison Standard (Moto)';
    let vehicleIcon = 'motorbike';

    if (vehicleType === 'truck') {
        requiredVehicle = 'large_car';
        vehicleTypeLabel = 'Livraison Grand Volume (Camion)';
        vehicleIcon = 'truck';
    } else if (vehicleType === 'car') {
        requiredVehicle = 'small_car';
        vehicleTypeLabel = 'Livraison Volumineuse (Voiture)';
        vehicleIcon = 'car';
    }

    // Use vehicle-specific pricing from documentation
    const vehicleSettings = l.vehicle_limits[vehicleType];
    console.log(`[DEBUG_PRICING] Vehicle: ${vehicleType}, Settings:`, vehicleSettings);

    const baseFee = vehicleSettings.base_price; // Removed fallback
    const pricePerKm = vehicleSettings.price_per_km; // Removed fallback
    const feePerKg = vehicleSettings.price_per_weight; // Removed fallback

    let distance = 0;
    if (pickup && dropoff) {
        const route = await getRoadDistance(pickup, dropoff);
        if (route.distance > 0) {
            distance = route.distance / 1000; // meters to KM
        } else {
            distance = getHaversineDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
        }
    }

    const distanceFee = distance * (pricePerKm || 0);
    const weightFee = totalWeight * (feePerKg || 0);
    const deliveryFee = (baseFee || 0) + distanceFee + weightFee;

    const platformMargin = subtotal * marginPercent;
    const tax = (subtotal + deliveryFee) * taxRate;
    const total = subtotal + deliveryFee + platformMargin + tax;

    // Return everything in DH (Floats)
    return {
        subtotal: parseFloat(subtotal.toFixed(2)),
        totalWeight: parseFloat(totalWeight.toFixed(2)),
        totalVolume: parseFloat(totalVolume.toFixed(6)),
        vehicleType,
        requiredVehicle,
        vehicleTypeLabel,
        vehicleIcon,
        distance: parseFloat(distance.toFixed(2)),
        deliveryFee: parseFloat(deliveryFee.toFixed(2)),
        platformMargin: parseFloat(platformMargin.toFixed(2)),
        livreurNet: parseFloat(deliveryFee.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        discount: 0,
        minOrderValue: cSettings.min_order_value,
        freeDeliveryThreshold: cSettings.free_delivery_threshold,
        dbTaxRate: settings.tax_percentage,
        dbMarginRate: settings.platform_margin_percentage,
        // Detailed rates for debug/UI - NO FALLBACKS RETURNED
        appliedBasePrice: baseFee,
        appliedPricePerKm: pricePerKm,
        appliedPricePerKg: feePerKg,
        appliedDistanceFee: parseFloat(distanceFee.toFixed(2)),
        appliedWeightFee: parseFloat(weightFee.toFixed(2))
    };
};

/**
 * POST /api/client/orders/calculate
 * Calculate pricing for a cart before checkout
 */
export const previewPricing = async (req: Request, res: Response) => {
    try {
        const { items, pickupLocation, dropoffLocation } = req.body;
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'Panier invalide' });
        }

        const pricing = await calculateOrderPricing(items, pickupLocation, dropoffLocation);
        res.json({ success: true, pricing });
    } catch (error) {
        console.error('[OrderController] Preview pricing error:', error);
        res.status(500).json({ success: false, message: 'Erreur de calcul' });
    }
};

/**
 * POST /api/client/orders
 * Create a new order
 */
export const createOrder = async (req: Request, res: Response) => {
    try {
        const { items, pickupLocation, dropoffLocation, paymentMethod } = req.body;
        const clientId = (req as any).user?.id;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Le panier est vide' });
        }

        // Fetch product images to store in history
        const productIds = items.map((i: any) => i._id);
        const products = await Product.find({ _id: { $in: productIds } });

        const enrichedItems = items.map((item: any) => {
            const product = products.find(p => p._id.toString() === item._id.toString());
            return {
                ...item,
                image: product?.images && product.images.length > 0 ? product.images[0] : undefined
            };
        });

        const pricing = await calculateOrderPricing(enrichedItems, pickupLocation, dropoffLocation);

        // Enforce Minimum Order Value
        if (pricing.subtotal < pricing.minOrderValue) {
            return res.status(400).json({
                success: false,
                message: `Le montant minimum de la commande est de ${pricing.minOrderValue} DH (votre panier est de ${pricing.subtotal} DH)`
            });
        }

        const newOrder = new Order({
            clientId,
            items: enrichedItems,
            totalWeight: pricing.totalWeight,
            totalVolume: pricing.totalVolume,
            requiredVehicle: pricing.requiredVehicle,
            vehicleTypeLabel: pricing.vehicleTypeLabel,
            vehicleIcon: pricing.vehicleIcon,
            distance: pricing.distance,
            pickupLocation,
            dropoffLocation,
            pricing,
            paymentMethod: paymentMethod || 'Cash',
            paymentStatus: paymentMethod === 'Card' ? 'Authorized' : 'Pending',
            status: 'SEARCHING_FOR_LIVREUR',
            timeline: [{
                status: 'PAID',
                timestamp: new Date(),
                actor: 'System',
                note: 'Paiement confirmé'
            }, {
                status: 'SEARCHING_FOR_LIVREUR',
                timestamp: new Date(),
                actor: 'System',
                note: 'Recherche d\'un livreur à proximité...'
            }],
            expansionStage: 0,
            eligibleLivreurs: [] // Placeholder, will set below
        });

        // Find 3 closest online and available drivers
        const top3Ids = await getClosestLivreurs(pickupLocation);
        newOrder.eligibleLivreurs = top3Ids;

        // Trigger Push Notifications to these specific drivers
        if (top3Ids.length > 0) {
            const onlineLivreurs = await Livreur.find({ _id: { $in: top3Ids } }).select('pushToken');

            const notificationTitle = 'Nouvelle commande à proximité !';
            const notificationBody = `Une commande de ${pricing.total} DH est disponible près de chez vous.`;
            const notificationData = { orderId: newOrder._id, type: 'NEW_ORDER' };

            onlineLivreurs.forEach(driver => {
                if (driver.pushToken) {
                    sendPushNotification(driver.pushToken, notificationTitle, notificationBody, notificationData)
                        .catch(err => console.error(`[OrderController] Push failed for driver ${driver._id}:`, err));
                }
            });
        }

        await newOrder.save();
        res.status(201).json({ success: true, orderId: newOrder._id, message: 'Commande créée avec succès' });
    } catch (error) {
        console.error('[OrderController] Create order error:', error);
        res.status(500).json({ success: false, message: 'Échec de la création de la commande' });
    }
};

/**
 * GET /api/client/orders
 * Query params: page, limit, type ('active' | 'history')
 */
export const getMyOrders = async (req: Request, res: Response) => {
    try {
        const clientId = (req as any).user?.id;
        const { page = 1, limit = 10, type } = req.query;

        console.log(`[OrderController] GetMyOrders - Client: ${clientId}, Type: ${type}, Page: ${page}`);

        const query: any = { clientId };

        if (type === 'history') {
            query.status = {
                $in: ['DELIVERED', 'COMPLETED', 'CANCELLED_CLIENT', 'CANCELLED_ADMIN', 'REFUNDED']
            };
        } else {
            // Default to 'active' orders if type is 'active' or undefined
            query.status = {
                $in: ['CREATED', 'PAID', 'SEARCHING_FOR_LIVREUR', 'ASSIGNED', 'SHOPPING', 'PICKED_UP', 'IN_TRANSIT']
            };
        }

        const skip = (Number(page) - 1) * Number(limit);
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Order.countDocuments(query);

        res.json({
            success: true,
            orders,
            hasMore: total > (skip + Number(limit))
        });
    } catch (error) {
        console.error('[OrderController] Get orders error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération de l\'historique' });
    }
};

/**
 * GET /api/client/orders/:id/map
 * Public/Private: Private
 * Desc: Get read-only map data for tracking
 */
export const getOrderMapData = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const clientId = (req as any).user?.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID invalide' });
        }

        const order = await Order.findById(id).select('clientId status pickupLocation dropoffLocation updatedAt livreurId');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Commande non trouvée' });
        }

        if (order.clientId.toString() !== clientId) {
            return res.status(403).json({ success: false, message: 'Accès non autorisé' });
        }

        // Prepare response data
        const data: any = {
            orderId: order._id,
            status: order.status,
            updatedAt: order.updatedAt,
            pickup: order.pickupLocation ? {
                lat: order.pickupLocation.lat,
                lng: order.pickupLocation.lng,
                address: order.pickupLocation.address // safe to share address? yes
            } : null,
            delivery: order.dropoffLocation ? {
                lat: order.dropoffLocation.lat,
                lng: order.dropoffLocation.lng,
                address: order.dropoffLocation.address
            } : null
        };

        // If order is active and not yet delivered/completed, include livreur location
        const activeStatuses = ['ASSIGNED', 'SHOPPING', 'PICKED_UP', 'IN_TRANSIT'];
        if (activeStatuses.includes(order.status) && order.livreurId) {
            try {
                const livreur = await Livreur.findById(order.livreurId).select('lastLocation');

                if (livreur && livreur.lastLocation && livreur.lastLocation.lat && livreur.lastLocation.lng) {
                    data.livreur = {
                        lat: livreur.lastLocation.lat,
                        lng: livreur.lastLocation.lng,
                        updatedAt: livreur.lastLocation.timestamp || new Date()
                    };
                }
            } catch (err) {
                console.error('[OrderController] Error fetching livreur location:', err);
                // Fail silent, just don't include livreur
            }
        }


        res.json({ success: true, data });
    } catch (error) {
        console.error('[OrderController] Map data error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des données de suivi' });
    }
};

/**
 * GET /api/client/orders/:id
 */
export const getMyOrderDetails = async (req: Request, res: Response) => {
    try {
        const clientId = (req as any).user?.id;
        const order = await Order.findOne({ _id: req.params.id, clientId })
            .populate('livreurId', 'name phoneNumber averageRating lastLocation selfie vehicle');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Commande non trouvée' });
        }

        res.json({ success: true, order });
    } catch (error) {
        console.error('[OrderController] Get order details error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des détails' });
    }
};

/**
 * POST /api/client/orders/:id/cancel
 * Client cancels an order (only if not DELIVERED)
 */
export const cancelOrder = async (req: Request, res: Response) => {
    try {
        const clientId = (req as any).user?.id;
        const { reason } = req.body;

        const order = await Order.findOne({ _id: req.params.id, clientId });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Commande non trouvée' });
        }

        // Prevent cancellation if picked up or later
        const nonCancellableStatuses = ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'REFUNDED', 'CANCELLED_CLIENT', 'CANCELLED_ADMIN', 'COMPLETED'];
        if (nonCancellableStatuses.includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Impossible d'annuler la commande. Statut actuel: ${order.status}`
            });
        }

        // Apply penalty warnings or restrictions logic could go here if status is PICKED_UP

        order.status = 'CANCELLED_CLIENT';
        order.cancellation = {
            reason: reason || 'Annulation client',
            timestamp: new Date(),
            cancelledBy: 'customer',
            penalty: 0
        };

        order.timeline.push({
            status: 'CANCELLED_CLIENT',
            timestamp: new Date(),
            actor: 'Client',
            note: 'Annulation demandée par le client'
        });

        // If a livreur was assigned, unassign or notify (in a real system)
        // For now, setting status to CANCELLED_CLIENT hides it from active livreur queries

        await order.save();

        res.json({ success: true, message: 'Commande annulée avec succès', order });
    } catch (error) {
        console.error('[OrderController] Cancel order error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de l\'annulation' });
    }
};

/**
 * POST /api/client/orders/:id/confirm
 * Client confirms delivery and gives rating/review
 */
export const confirmOrder = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        const clientId = (req as any).user?.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'ID de commande invalide.' });
        }

        const order = await Order.findById(id).session(session);

        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Commande non trouvée.' });
        }

        // Verify ownership
        if (order.clientId.toString() !== clientId) {
            await session.abortTransaction();
            return res.status(403).json({ success: false, message: 'Non autorisé.' });
        }

        // Only allow confirm if status is DELIVERED
        if (order.status !== 'DELIVERED') {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `La commande ne peut pas être confirmée car son statut est : ${order.status}`
            });
        }

        // Update Order Status
        order.status = 'COMPLETED';
        order.timeline.push({
            status: 'COMPLETED',
            timestamp: new Date(),
            actor: 'Client',
            note: 'Livraison confirmée par le client'
        });

        await order.save({ session });

        // Add review to Livreur if rating is provided
        if (rating && order.livreurId) {
            const livreur = await Livreur.findById(order.livreurId).session(session);
            if (livreur) {
                const client = await Client.findById(clientId).select('name');

                livreur.reviews.push({
                    clientId: new mongoose.Types.ObjectId(clientId),
                    clientName: client?.name || 'Client',
                    rating: Number(rating),
                    comment: comment || '',
                    createdAt: new Date()
                });

                // Recalculate average rating
                const totalRatings = livreur.reviews.reduce((sum, rev) => sum + rev.rating, 0);
                livreur.averageRating = Number((totalRatings / livreur.reviews.length).toFixed(1));

                await livreur.save({ session });
            }
        }

        await session.commitTransaction();
        res.status(200).json({ success: true, message: 'Commande confirmée avec succès.', order });
    } catch (error) {
        await session.abortTransaction();
        console.error('[OrderController] Confirm order error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la confirmation de la commande.' });
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Send a message for an order
 * @route   POST /api/client/orders/:id/messages
 * @access  Private/Client
 */
export const sendOrderMessage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        const clientId = (req as any).user?.id;

        if (!text) {
            return res.status(400).json({ success: false, message: 'Le message est vide.' });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Commande non trouvée.' });
        }

        // Security: Ensure the requesting client is the owner
        if (order.clientId?.toString() !== clientId) {
            return res.status(403).json({ success: false, message: 'Non autorisé.' });
        }

        if (!order.chatMessages) order.chatMessages = [];

        order.chatMessages.push({
            sender: 'Client',
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
        console.error('[CLIENT_CHAT] Send Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi du message.' });
    }
};

/**
 * @desc    Get chat messages for an order
 * @route   GET /api/client/orders/:id/messages
 * @access  Private/Client
 */
export const getOrderMessages = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const clientId = (req as any).user?.id;

        const order = await Order.findById(id).select('chatMessages clientId');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Commande non trouvée.' });
        }

        // Security
        if (order.clientId?.toString() !== clientId) {
            return res.status(403).json({ success: false, message: 'Non autorisé.' });
        }

        res.status(200).json({
            success: true,
            chatMessages: order.chatMessages || []
        });
    } catch (error: any) {
        console.error('[CLIENT_CHAT] Get Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des messages.' });
    }
};
