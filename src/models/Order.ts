import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrder extends Document {
    clientId: mongoose.Types.ObjectId;
    livreurId?: mongoose.Types.ObjectId;
    status: 'CREATED' | 'PAID' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED_CLIENT' | 'CANCELLED_ADMIN' | 'REFUNDED';

    // Core Info
    items: Array<{
        name: string;
        quantity: number;
        unitWeight?: number; // In Kg
        totalWeight?: number; // In Kg
        price: number;
    }>;
    totalWeight: number; // Sum of items weight

    // Locations
    pickupLocation?: {
        address: string;
        lat: number;
        lng: number;
    };
    dropoffLocation?: {
        address: string;
        lat: number;
        lng: number;
    };

    // Financials
    pricing: {
        subtotal: number;
        deliveryFee: number; // Base fee + Distance fee
        startDeliveryFee?: number; // Fee when order was created (for history)
        platformMargin: number; // Sala's profit
        livreurNet: number; // What the driver gets
        tax: number;
        total: number; // Client pays this
        discount: number;
    };

    // Payment
    paymentStatus: 'Pending' | 'Authorized' | 'Captured' | 'Refunded' | 'Failed';
    paymentMethod: 'Cash' | 'Card' | 'Wallet';
    providerTransactionId?: string;

    // Timeline & Audit
    timeline: Array<{
        status: string;
        timestamp: Date;
        note?: string;
        actor?: string; // 'System', 'Admin', 'Client', 'Livreur'
    }>;

    // Admin / Audit
    adminNotes: Array<{
        note: string;
        adminId: mongoose.Types.ObjectId;
        adminName: string;
        createdAt: Date;
    }>;
    auditLogs: Array<{
        action: string; // 'STATUS_CHANGE', 'REFUND', 'REASSIGN'
        performedBy: mongoose.Types.ObjectId; // Admin ID
        performedByName: string;
        details: string; // JSON string or text details
        timestamp: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const OrderSchema: Schema = new Schema(
    {
        clientId: {
            type: Schema.Types.ObjectId,
            ref: 'Client',
            required: true,
            index: true
        },
        livreurId: {
            type: Schema.Types.ObjectId,
            ref: 'Livreur',
            index: true
        },
        status: {
            type: String,
            enum: ['CREATED', 'PAID', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED_CLIENT', 'CANCELLED_ADMIN', 'REFUNDED'],
            default: 'CREATED',
            index: true
        },
        items: [
            {
                name: String,
                quantity: Number,
                unitWeight: { type: Number, default: 0 },
                totalWeight: { type: Number, default: 0 },
                price: Number,
            }
        ],
        totalWeight: { type: Number, default: 0 },

        pickupLocation: {
            address: String,
            lat: Number,
            lng: Number,
        },
        dropoffLocation: {
            address: String,
            lat: Number,
            lng: Number,
        },

        pricing: {
            subtotal: { type: Number, default: 0 },
            deliveryFee: { type: Number, default: 0 },
            platformMargin: { type: Number, default: 0 },
            livreurNet: { type: Number, default: 0 },
            tax: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
            discount: { type: Number, default: 0 },
        },

        paymentStatus: {
            type: String,
            enum: ['Pending', 'Authorized', 'Captured', 'Refunded', 'Failed'],
            default: 'Pending',
            index: true
        },
        paymentMethod: {
            type: String,
            enum: ['Cash', 'Card', 'Wallet'],
            default: 'Cash'
        },
        providerTransactionId: String,

        timeline: [
            {
                status: String,
                timestamp: { type: Date, default: Date.now },
                note: String,
                actor: String
            }
        ],

        adminNotes: [
            {
                note: String,
                adminId: Schema.Types.ObjectId,
                adminName: String,
                createdAt: { type: Date, default: Date.now }
            }
        ],
        auditLogs: [
            {
                action: String,
                performedBy: Schema.Types.ObjectId,
                performedByName: String,
                details: String,
                timestamp: { type: Date, default: Date.now }
            }
        ]
    },
    {
        timestamps: true,
        collection: 'Orders',
    }
);

// Indexes for better search performance
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'pickupLocation.city': 1 }); // Optional: if city is added to location
const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
