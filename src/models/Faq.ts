import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFaq extends Document {
    question: {
        fr: string;
        ar: string;
        en: string;
    };
    answer: {
        fr: string;
        ar: string;
        en: string;
    };
    category: string;
    order: number;
    isActive: boolean;
}

const FaqSchema: Schema = new Schema(
    {
        question: {
            fr: { type: String, required: true },
            ar: { type: String, required: true },
            en: { type: String, required: true },
        },
        answer: {
            fr: { type: String, required: true },
            ar: { type: String, required: true },
            en: { type: String, required: true },
        },
        category: {
            type: String,
            key: String,
            required: true,
            default: 'general'
        },
        order: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        collection: 'Faqs'
    }
);

// index for sorting
FaqSchema.index({ category: 1, order: 1 });

const Faq: Model<IFaq> = mongoose.models.Faq || mongoose.model<IFaq>('Faq', FaqSchema);

export default Faq;
