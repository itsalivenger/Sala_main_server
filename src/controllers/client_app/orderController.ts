import { Request, Response } from 'express';
import Order from '../../models/Order';
import Livreur from '../../models/Livreur';
import Product from '../../models/Product';
import PlatformSettings from '../../models/PlatformSettings';
import mongoose from 'mongoose';

// Logic moved into calculateOrderPricing with PlatformSettings lookup

/**
 * Helper for distance calculation (Haversine)
 */
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
};

const deg2rad = (deg: number) => deg * (Math.PI / 180);

/**
 * Find the 5 closest online and available livreurs
 */
const getClosestLivreurs = async (pickupLocation: { lat: number, lng: number }, limit: number = 5) => {
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

        // 3. Calculate distances and sort
        const rankedLivreurs = availableLivreurs
            .map(livreur => {
                const distance = getDistanceKm(
                    pickupLocation.lat,
                    pickupLocation.lng,
                    livreur.lastLocation!.lat,
                    livreur.lastLocation!.lng
                );
                return { id: livreur._id, distance };
            })
            .sort((a, b) => a.distance - b.distance)
            .slice(0, limit);

        console.log(`[OrderController] Found ${rankedLivreurs.length} recommended drivers near pickup.`);
        return rankedLivreurs.map(r => r.id);
    } catch (error) {
        console.error('[OrderController] Error finding closest livreurs:', error);
        return [];
    }
};

/**
 * Helper to calculate order pricing
 */
const calculateOrderPricing = async (items: any[], pickup?: any, dropoff?: any) => {
    const settings = await PlatformSettings.findOne();
    const baseFee = (settings?.delivery_base_price || 1500) / 100; // cents to DH
    const pricePerKm = (settings?.delivery_price_per_km || 500) / 100;
    const feePerKg = (settings?.delivery_price_per_weight_unit || 500) / 100;
    const marginPercent = (settings?.platform_margin_percentage || 15) / 100;
    const TAX_PERCENT = 0.2;

    let subtotal = 0;
    let totalWeight = 0;

    items.forEach(item => {
        subtotal += item.price * item.quantity;
        totalWeight += (item.unitWeight || 0) * item.quantity;
    });

    let distance = 0;
    if (pickup && dropoff) {
        distance = getDistanceKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
    }

    // Delivery Fee calculation
    const distanceFee = distance * pricePerKm;
    const weightFee = Math.max(0, (totalWeight - 1) * feePerKg);
    const deliveryFee = baseFee + distanceFee + weightFee;

    const platformMargin = subtotal * marginPercent;
    const tax = (subtotal + deliveryFee) * TAX_PERCENT;
    const total = subtotal + deliveryFee + platformMargin + tax;

    return {
        subtotal,
        totalWeight,
        distance: Math.round(distance * 100) / 100,
        deliveryFee: Math.round(deliveryFee * 100) / 100,
        platformMargin: Math.round(platformMargin * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        total: Math.round(total * 100) / 100,
        discount: 0
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

        const newOrder = new Order({
            clientId,
            items: enrichedItems,
            totalWeight: pricing.totalWeight,
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
            eligibleLivreurs: [] // Placeholder, will set below
        });

        // Recommend 5 closest drivers
        const top5 = await getClosestLivreurs(pickupLocation);
        newOrder.eligibleLivreurs = top5;

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
                $in: ['COMPLETED', 'CANCELLED_CLIENT', 'CANCELLED_ADMIN', 'REFUNDED']
            };
        } else {
            // Default to 'active' orders if type is 'active' or undefined
            query.status = {
                $in: ['CREATED', 'PAID', 'SEARCHING_FOR_LIVREUR', 'ASSIGNED', 'SHOPPING', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']
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
