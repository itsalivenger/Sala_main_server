import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
    name: string;
    description: string;
    price: number;
    unitWeight: number; // In Kg
    category: string;
    image?: string;
    tags: string[];
    isAvailable: boolean;
    stockQuantity: number;
    createdAt: Date;
    updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
    {
        name: { type: String, required: true, index: true },
        description: { type: String, required: true },
        price: { type: Number, required: true },
        unitWeight: { type: Number, required: true },
        category: { type: String, required: true, index: true },
        image: { type: String },
        tags: [{ type: String, index: true }],
        isAvailable: { type: Boolean, default: true },
        stockQuantity: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        collection: 'Products',
    }
);

// Search indexes
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
