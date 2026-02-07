import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlatformSettings extends Document {
    platform_margin_percentage: number;     // e.g., 15%
    minimum_payout_amount: number;          // e.g., 50.00 DH
    tax_percentage: number;                 // e.g., 20%
    livreur: {
        min_funds_withdrawal: number;       // e.g., 50.00 DH
        radius_max_km: number;
        min_rating_to_work: number;
        vehicle_limits: {
            bike: { max_weight: number; max_volume: number; base_price: number; price_per_km: number; price_per_weight: number };
            car: { max_weight: number; max_volume: number; base_price: number; price_per_km: number; price_per_weight: number };
            truck: { max_weight: number; max_volume: number; base_price: number; price_per_km: number; price_per_weight: number };
        };
        max_active_orders: number;
    };
    client: {
        min_order_value: number;            // e.g., 50.00 DH
        first_order_discount: number;       // e.g., 10.00 DH
        referral_bonus_amount: number;       // e.g., 5.00 DH
        support_target_minutes: number;
        free_delivery_threshold: number;    // e.g., 200.00 DH
        max_order_volume: number;           // e.g., 0.3 m3
    };
    max_categories: number;
    logistics: {
        max_weight_per_unit: number;    // e.g., 5 kg
        max_volume_per_unit: number;    // e.g., 30 liters
        pricing_multiplier: number;     // e.g., 1 or 1.5 for second unit
    };
    updatedAt: Date;
}

const PlatformSettingsSchema: Schema = new Schema(
    {
        platform_margin_percentage: { type: Number, required: true, default: 15 },
        minimum_payout_amount: { type: Number, required: true, default: 50 },
        tax_percentage: { type: Number, required: true, default: 20 },
        livreur: {
            min_funds_withdrawal: { type: Number, default: 50 },
            radius_max_km: { type: Number, default: 10 },
            min_rating_to_work: { type: Number, default: 4 },
            vehicle_limits: {
                bike: {
                    max_weight: { type: Number, default: 10 },
                    max_volume: { type: Number, default: 0.1 },
                    base_price: { type: Number, default: 15 },
                    price_per_km: { type: Number, default: 5 },
                    price_per_weight: { type: Number, default: 5 }
                },
                car: {
                    max_weight: { type: Number, default: 100 },
                    max_volume: { type: Number, default: 1 },
                    base_price: { type: Number, default: 30 },
                    price_per_km: { type: Number, default: 7 },
                    price_per_weight: { type: Number, default: 7 }
                },
                truck: {
                    max_weight: { type: Number, default: 1000 },
                    max_volume: { type: Number, default: 10 },
                    base_price: { type: Number, default: 100 },
                    price_per_km: { type: Number, default: 10 },
                    price_per_weight: { type: Number, default: 10 }
                }
            },
            max_active_orders: { type: Number, default: 3 }
        },
        client: {
            min_order_value: { type: Number, default: 50 },
            first_order_discount: { type: Number, default: 10 },
            referral_bonus_amount: { type: Number, default: 5 },
            support_target_minutes: { type: Number, default: 15 },
            free_delivery_threshold: { type: Number, default: 200 },
            max_order_volume: { type: Number, default: 0.3 }
        },
        max_categories: { type: Number, default: 20 },
        logistics: {
            max_weight_per_unit: { type: Number, default: 5 },
            max_volume_per_unit: { type: Number, default: 30 },
            pricing_multiplier: { type: Number, default: 1 }
        }
    },
    {
        timestamps: { createdAt: false, updatedAt: true },
        collection: 'PlatformSettings',
    }
);

const PlatformSettings: Model<IPlatformSettings> = mongoose.models.PlatformSettings || mongoose.model<IPlatformSettings>('PlatformSettings', PlatformSettingsSchema);

export default PlatformSettings;
