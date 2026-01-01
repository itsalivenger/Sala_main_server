import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrder extends Document {
    livreurId?: mongoose.Types.ObjectId;
    clientId: mongoose.Types.ObjectId;
    status: 'Pending' | 'Assigned' | 'PickedUp' | 'Completed' | 'Cancelled' | 'Refunded';
    totalPrice: number; // in cents
    weight: number; // in weight units defined in settings
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    deliveryAddress: string;
    pickupAddress: string;
    createdAt: Date;
    updatedAt: Date;
}

const OrderSchema: Schema = new Schema(
    {
        livreurId: {
            type: Schema.Types.ObjectId,
            ref: 'Livreur',
        },
        clientId: {
            type: Schema.Types.ObjectId,
            ref: 'Client',
            required: true,
        },
        status: {
            type: String,
            enum: ['Pending', 'Assigned', 'PickedUp', 'Completed', 'Cancelled', 'Refunded'],
            default: 'Pending',
        },
        totalPrice: {
            type: Number,
            required: true,
        },
        weight: {
            type: Number,
            required: true,
            default: 1,
        },
        items: [
            {
                name: String,
                quantity: Number,
                price: Number,
            },
        ],
        deliveryAddress: String,
        pickupAddress: String,
    },
    {
        timestamps: true,
        collection: 'Orders',
    }
);

const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
