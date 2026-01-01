import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILivreurTransaction extends Document {
    livreurId: mongoose.Types.ObjectId;
    amount: number;
    type: 'Credit' | 'Debit';
    category: 'Payout' | 'Withdrawal' | 'Adjustment' | 'Reversal';
    description: string;
    status: 'Pending' | 'Completed' | 'Rejected';
    adminId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const LivreurTransactionSchema: Schema = new Schema(
    {
        livreurId: {
            type: Schema.Types.ObjectId,
            ref: 'Livreur',
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        type: {
            type: String,
            enum: ['Credit', 'Debit'],
            required: true,
        },
        category: {
            type: String,
            enum: ['Payout', 'Withdrawal', 'Adjustment', 'Reversal'],
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['Pending', 'Completed', 'Rejected'],
            default: 'Completed',
        },
        adminId: {
            type: Schema.Types.ObjectId,
            ref: 'Admin',
        },
    },
    {
        timestamps: true,
        collection: 'LivreurTransactions',
    }
);

const LivreurTransaction: Model<ILivreurTransaction> = mongoose.models.LivreurTransaction || mongoose.model<ILivreurTransaction>('LivreurTransaction', LivreurTransactionSchema);

export default LivreurTransaction;
