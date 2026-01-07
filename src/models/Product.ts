import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
    name: string;
    description: string;
    price: number; // For legacy/reference, not editable via new admin
    unitWeight: number; // In Kg
    weightClass: 'NORMAL' | 'HEAVY' | 'FRAGILE' | 'LIQUID'; // Added weight class
    dimensions: {
        length: number; // in cm
        width: number; // in cm
        height: number; // in cm
    };
    category: string;
    images: string[]; // Changed image string to images array
    tags: string[];
    isActive: boolean; // Added for soft-delete/deactivation
    isAvailable: boolean; // Keep for legacy client app support
    stockQuantity: number; // For reference/legacy
    createdAt: Date;
    updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
    {
        name: { type: String, required: true, index: true },
        description: { type: String, required: true },
        price: { type: Number, default: 0 }, // Changed to default 0
        unitWeight: { type: Number, required: true },
        weightClass: {
            type: String,
            enum: ['NORMAL', 'HEAVY', 'FRAGILE', 'LIQUID'],
            default: 'NORMAL',
            index: true
        },
        dimensions: {
            length: { type: Number, default: 0 },
            width: { type: Number, default: 0 },
            height: { type: Number, default: 0 },
        },
        category: { type: String, required: true, index: true },
        images: [{ type: String }], // Array of strings for external storage URLs
        tags: [{ type: String, index: true }],
        isActive: { type: Boolean, default: true, index: true },
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
