import mongoose, { Schema, Document, Model } from 'mongoose';

export enum TransactionType {
    ORDER_PAYOUT = 'ORDER_PAYOUT',
    ORDER_REVERSAL = 'ORDER_REVERSAL',
    WITHDRAWAL = 'WITHDRAWAL',
    ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
}

export interface IWalletTransaction extends Document {
    walletId: mongoose.Types.ObjectId;
    type: TransactionType;
    amount: number; // in cents, can be negative
    referenceType: 'Order' | 'Withdrawal' | 'Admin';
    referenceId: mongoose.Types.ObjectId;
    description?: string;
    createdAt: Date;
}

const WalletTransactionSchema: Schema = new Schema(
    {
        walletId: {
            type: Schema.Types.ObjectId,
            ref: 'Wallet',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: Object.values(TransactionType),
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        referenceType: {
            type: String,
            enum: ['Order', 'Withdrawal', 'Admin'],
            required: true,
        },
        referenceId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        description: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        collection: 'WalletTransactions',
    }
);

// Index for ledger audits
WalletTransactionSchema.index({ walletId: 1, createdAt: -1 });

const WalletTransaction: Model<IWalletTransaction> = mongoose.models.WalletTransaction || mongoose.model<IWalletTransaction>('WalletTransaction', WalletTransactionSchema);

export default WalletTransaction;
