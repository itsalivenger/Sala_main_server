import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlatformSettings extends Document {
    delivery_price_per_weight_unit: number; // in cents
    weight_unit_kg: number;
    platform_margin_percentage: number;
    minimum_payout_amount: number; // in cents
    updatedAt: Date;
}

const PlatformSettingsSchema: Schema = new Schema(
    {
        delivery_price_per_weight_unit: {
            type: Number,
            required: true,
            default: 1000, // 10.00 MAD per unit
        },
        weight_unit_kg: {
            type: Number,
            required: true,
            default: 1, // 1kg
        },
        platform_margin_percentage: {
            type: Number,
            required: true,
            default: 15, // 15%
        },
        minimum_payout_amount: {
            type: Number,
            required: true,
            default: 5000, // 50.00 MAD
        },
    },
    {
        timestamps: { createdAt: false, updatedAt: true },
        collection: 'PlatformSettings',
    }
);

const PlatformSettings: Model<IPlatformSettings> = mongoose.models.PlatformSettings || mongoose.model<IPlatformSettings>('PlatformSettings', PlatformSettingsSchema);

export default PlatformSettings;
