import { Request, Response } from 'express';
import Order from '../../models/Order';
import Product from '../../models/Product';
import mongoose from 'mongoose';

// Business Logic constants (could be in Settings model later)
const DELIVERY_BASE_FEE = 15; // 15 DH base
const FEE_PER_KG = 5; // 5 DH per kg after 1st kg
const PLATFORM_MARGIN_PERCENT = 0.1; // 10%
const TAX_PERCENT = 0.2; // 20%

/**
 * Helper to calculate order pricing
 */
const calculateOrderPricing = (items: any[]) => {
    let subtotal = 0;
    let totalWeight = 0;

    items.forEach(item => {
        subtotal += item.price * item.quantity;
        totalWeight += (item.unitWeight || 0) * item.quantity;
    });

    // Delivery Fee calculation
    const weightFee = Math.max(0, (totalWeight - 1) * FEE_PER_KG);
    const deliveryFee = DELIVERY_BASE_FEE + weightFee;

    const platformMargin = subtotal * PLATFORM_MARGIN_PERCENT;
    const tax = (subtotal + deliveryFee) * TAX_PERCENT;
    const total = subtotal + deliveryFee + platformMargin + tax;

    return {
        subtotal,
        totalWeight,
        deliveryFee,
        platformMargin,
        tax,
        total,
        discount: 0
    };
};

/**
 * POST /api/client/orders/calculate
 * Calculate pricing for a cart before checkout
 */
export const previewPricing = async (req: Request, res: Response) => {
    try {
        const { items } = req.body;
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'Panier invalide' });
        }

        const pricing = calculateOrderPricing(items);
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

        const pricing = calculateOrderPricing(items);

        const newOrder = new Order({
            clientId,
            items,
            totalWeight: pricing.totalWeight,
            pickupLocation,
            dropoffLocation,
            pricing,
            paymentMethod: paymentMethod || 'Cash',
            paymentStatus: paymentMethod === 'Card' ? 'Authorized' : 'Pending',
            status: 'CREATED',
            timeline: [{
                status: 'CREATED',
                timestamp: new Date(),
                actor: 'Client',
                note: 'Commande créée par le client'
            }]
        });

        await newOrder.save();
        res.status(201).json({ success: true, orderId: newOrder._id, message: 'Commande créée avec succès' });
    } catch (error) {
        console.error('[OrderController] Create order error:', error);
        res.status(500).json({ success: false, message: 'Échec de la création de la commande' });
    }
};

/**
 * GET /api/client/orders
 */
export const getMyOrders = async (req: Request, res: Response) => {
    try {
        const clientId = (req as any).user?.id;
        const { page = 1, limit = 10 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const orders = await Order.find({ clientId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Order.countDocuments({ clientId });

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
 * GET /api/client/orders/:id
 */
export const getMyOrderDetails = async (req: Request, res: Response) => {
    try {
        const clientId = (req as any).user?.id;
        const order = await Order.findOne({ _id: req.params.id, clientId });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Commande non trouvée' });
        }

        res.json({ success: true, order });
    } catch (error) {
        console.error('[OrderController] Get order details error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des détails' });
    }
};
