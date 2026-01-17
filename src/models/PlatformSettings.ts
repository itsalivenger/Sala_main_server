import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlatformSettings extends Document {
    delivery_price_per_weight_unit: number; // in cents
    weight_unit_kg: number;
    platform_margin_percentage: number;
    minimum_payout_amount: number; // in cents
    livreur: {
        min_funds_withdrawal: number;
        radius_max_km: number;
        min_rating_to_work: number;
        vehicle_limits: {
            bike: { max_weight: number; max_volume: number };
            car: { max_weight: number; max_volume: number };
            truck: { max_weight: number; max_volume: number };
        };
        max_active_orders: number;
    };
    client: {
        min_order_value: number;
        first_order_discount: number;
        referral_bonus_amount: number;
        support_target_minutes: number;
        free_delivery_threshold: number;
    };
    max_categories: number;
    updatedAt: Date;
}

const PlatformSettingsSchema: Schema = new Schema(
    {
        delivery_price_per_weight_unit: { type: Number, required: true, default: 1000 },
        weight_unit_kg: { type: Number, required: true, default: 1 },
        platform_margin_percentage: { type: Number, required: true, default: 15 },
        minimum_payout_amount: { type: Number, required: true, default: 5000 },
        livreur: {
            min_funds_withdrawal: { type: Number, default: 5000 },
            radius_max_km: { type: Number, default: 10 },
            min_rating_to_work: { type: Number, default: 4 },
            vehicle_limits: {
                bike: {
                    max_weight: { type: Number, default: 10 },
                    max_volume: { type: Number, default: 0.1 }
                },
                car: {
                    max_weight: { type: Number, default: 100 },
                    max_volume: { type: Number, default: 1 }
                },
                truck: {
                    max_weight: { type: Number, default: 1000 },
                    max_volume: { type: Number, default: 10 }
                }
            },
            max_active_orders: { type: Number, default: 3 }
        },
        client: {
            min_order_value: { type: Number, default: 5000 },
            first_order_discount: { type: Number, default: 1000 },
            referral_bonus_amount: { type: Number, default: 500 },
            support_target_minutes: { type: Number, default: 15 },
            free_delivery_threshold: { type: Number, default: 20000 }
        },
        max_categories: { type: Number, default: 20 }
    },
    {
        timestamps: { createdAt: false, updatedAt: true },
        collection: 'PlatformSettings',
    }
);

const PlatformSettings: Model<IPlatformSettings> = mongoose.models.PlatformSettings || mongoose.model<IPlatformSettings>('PlatformSettings', PlatformSettingsSchema);

export default PlatformSettings;
