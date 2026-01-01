import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Order from '../../models/Order';
import Client from '../../models/Client';
import Livreur from '../../models/Livreur';

// Types for Filters
interface OrderFilters {
    status?: string;
    clientId?: string;
    livreurId?: string;
    city?: string;
    startDate?: Date;
    endDate?: Date;
    paymentStatus?: string;
}

// === GET ALL ORDERS (Paginated & Filtered) ===
export const getOrders = async (req: Request, res: Response) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            client,
            livreur,
            city,
            startDate,
            endDate,
            paymentStatus
        } = req.query;

        const query: any = {};

        // Filters
        if (status) query.status = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (client && mongoose.Types.ObjectId.isValid(client as string)) {
            query.clientId = new mongoose.Types.ObjectId(client as string);
        }
        if (livreur && mongoose.Types.ObjectId.isValid(livreur as string)) {
            query.livreurId = new mongoose.Types.ObjectId(livreur as string);
        }
        if (city) query['pickupLocation.address'] = { $regex: city, $options: 'i' }; // Simple regex for now

        // Date Range
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate as string);
            if (endDate) query.createdAt.$lte = new Date(endDate as string);
        }

        const skip = (Number(page) - 1) * Number(limit);

        // Fetch Orders with basic population
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .populate('clientId', 'name phoneNumber')
            .populate('livreurId', 'name phoneNumber');

        const total = await Order.countDocuments(query);

        res.json({
            orders,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        });

    } catch (error: any) {
        console.error('Get Orders Error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
};

// === GET ORDER DETAILS ===
export const getOrderDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const order = await Order.findById(id)
            .populate('clientId', 'name phoneNumber city walletBalance')
            .populate('livreurId', 'name phoneNumber vehicle status documents');

        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        res.json(order);

    } catch (error: any) {
        console.error('Get Order Details Error:', error);
        res.status(500).json({ error: 'Failed to fetch order details' });
    }
};

// === UPDATE ORDER STATUS (With Audit) ===
export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;
        const adminId = (req as any).user?.id;
        // Mock admin name for now, in real scenario fetch from Admin model
        const adminName = 'Admin';

        const order = await Order.findById(id);

        if (!order) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }

        const oldStatus = order.status;

        // Validations can go here (e.g. state machine checks)

        order.status = status;

        // Add to timeline
        order.timeline.push({
            status,
            timestamp: new Date(),
            note,
            actor: 'Admin'
        });

        // Add to Audit Log
        order.auditLogs.push({
            action: 'STATUS_CHANGE',
            performedBy: adminId,
            performedByName: adminName,
            details: `Changed status from ${oldStatus} to ${status}. Note: ${note || 'None'}`,
            timestamp: new Date()
        });

        await order.save();

        res.json(order);

    } catch (error: any) {
        console.error('Update Order Status Error:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
};

// === ADD INTERNAL NOTE ===
export const addOrderNote = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { note } = req.body;
        const adminId = (req as any).user?.id;
        const adminName = 'Admin';

        const order = await Order.findByIdAndUpdate(
            id,
            {
                $push: {
                    adminNotes: {
                        note,
                        adminId,
                        adminName,
                        createdAt: new Date()
                    },
                    auditLogs: {
                        action: 'ADD_NOTE',
                        performedBy: adminId,
                        performedByName: adminName,
                        details: `Added internal note: ${note.substring(0, 50)}...`,
                        timestamp: new Date()
                    }
                }
            },
            { new: true }
        );

        res.json(order);

    } catch (error: any) {
        console.error('Add Note Error:', error);
        res.status(500).json({ error: 'Failed to add note' });
    }
};
