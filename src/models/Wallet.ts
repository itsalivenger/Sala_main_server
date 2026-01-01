import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWallet extends Document {
    livreurId: mongoose.Types.ObjectId;
    balance: number; // in cents
    currency: string;
    createdAt: Date;
    updatedAt: Date;
}

const WalletSchema: Schema = new Schema(
    {
        livreurId: {
            type: Schema.Types.ObjectId,
            ref: 'Livreur',
            required: true,
            unique: true,
        },
        balance: {
            type: Number,
            required: true,
            default: 0,
        },
        currency: {
            type: String,
            required: true,
            default: 'MAD',
        },
    },
    {
        timestamps: true,
        collection: 'Wallets',
    }
);

const Wallet: Model<IWallet> = mongoose.models.Wallet || mongoose.model<IWallet>('Wallet', WalletSchema);

export default Wallet;
