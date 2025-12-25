import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrder extends Document {
    clientId: mongoose.Types.ObjectId;
    livreurId?: mongoose.Types.ObjectId;
    status: 'Pending' | 'Accepted' | 'Picked Up' | 'Delivered' | 'Cancelled' | 'Disputed';
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    pricing: {
        subtotal: number;
        deliveryFee: number;
        discount: number;
        total: number;
    };
    timeline: Array<{
        status: string;
        timestamp: Date;
        note?: string;
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
        },
        livreurId: {
            type: Schema.Types.ObjectId,
            ref: 'Livreur',
        },
        status: {
            type: String,
            enum: ['Pending', 'Accepted', 'Picked Up', 'Delivered', 'Cancelled', 'Disputed'],
            default: 'Pending',
        },
        items: [
            {
                name: String,
                quantity: Number,
                price: Number,
            }
        ],
        pricing: {
            subtotal: { type: Number, default: 0 },
            deliveryFee: { type: Number, default: 0 },
            discount: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
        },
        timeline: [
            {
                status: String,
                timestamp: { type: Date, default: Date.now },
                note: String,
            }
        ],
    },
    {
        timestamps: true,
        collection: 'Orders',
    }
);

const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
