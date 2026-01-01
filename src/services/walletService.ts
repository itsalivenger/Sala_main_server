import mongoose from 'mongoose';
import PlatformSettings, { IPlatformSettings } from '../models/PlatformSettings';
import Wallet, { IWallet } from '../models/Wallet';
import WalletTransaction, { TransactionType } from '../models/WalletTransaction';
import Order, { IOrder } from '../models/Order';

class WalletService {
    /**
     * Get global platform settings. Initializes with defaults if not present.
     */
    async getPlatformSettings(): Promise<IPlatformSettings> {
        let settings = await PlatformSettings.findOne();
        if (!settings) {
            settings = await PlatformSettings.create({
                delivery_price_per_weight_unit: 1000,
                weight_unit_kg: 1,
                platform_margin_percentage: 15,
                minimum_payout_amount: 5000,
            });
        }
        return settings;
    }

    /**
     * Get or create a wallet for a livreur.
     */
    async getOrCreateWallet(livreurId: string, session?: mongoose.ClientSession): Promise<IWallet> {
        let wallet = await Wallet.findOne({ livreurId }).session(session || null);
        if (!wallet) {
            wallet = new Wallet({
                livreurId,
                balance: 0,
                currency: 'MAD',
            });
            await wallet.save({ session });
        }
        return wallet;
    }

    /**
     * Credits the livreur wallet following an order completion.
     * Everything is wrapped in a Mongoose session for ACID safety.
     */
    async creditWalletForOrder(orderId: string): Promise<{ success: boolean; message?: string }> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const order = await Order.findById(orderId).session(session);
            if (!order) throw new Error('Order not found');
            if (order.status !== 'Completed') throw new Error('Order is not completed');
            if (!order.livreurId) throw new Error('No livreur assigned to this order');

            // Check if payout already exists for this order
            const existingTx = await WalletTransaction.findOne({
                referenceType: 'Order',
                referenceId: order._id,
                type: TransactionType.ORDER_PAYOUT
            }).session(session);

            if (existingTx) throw new Error('Payout already processed for this order');

            const settings = await this.getPlatformSettings();

            // Calculation logic
            const totalDeliveryPrice = order.totalPrice; // Basic assumption: order price = delivery price for now
            const platformMargin = Math.round((totalDeliveryPrice * settings.platform_margin_percentage) / 100);
            const netPayout = totalDeliveryPrice - platformMargin;

            // Update Wallet
            const wallet = await this.getOrCreateWallet(order.livreurId.toString(), session);
            wallet.balance += netPayout;
            await wallet.save({ session });

            // Create Ledger Entry
            await WalletTransaction.create([{
                walletId: wallet._id,
                type: TransactionType.ORDER_PAYOUT,
                amount: netPayout,
                referenceType: 'Order',
                referenceId: order._id,
                description: `Payout for order #${order._id.toString().slice(-6)}`,
            }], { session });

            await session.commitTransaction();
            return { success: true };
        } catch (error: any) {
            await session.abortTransaction();
            console.error('Wallet Credit Error:', error.message);
            return { success: false, message: error.message };
        } finally {
            session.endSession();
        }
    }

    /**
     * Reverses an order payout (e.g., if order is refunded/cancelled after completion).
     */
    async reverseOrderPayout(orderId: string): Promise<{ success: boolean; message?: string }> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const originalTx = await WalletTransaction.findOne({
                referenceType: 'Order',
                referenceId: orderId,
                type: TransactionType.ORDER_PAYOUT
            }).session(session);

            if (!originalTx) throw new Error('No payout found for this order');

            // Check if already reversed
            const existingReversal = await WalletTransaction.findOne({
                referenceType: 'Order',
                referenceId: orderId,
                type: TransactionType.ORDER_REVERSAL
            }).session(session);

            if (existingReversal) throw new Error('Payout already reversed');

            const wallet = await Wallet.findById(originalTx.walletId).session(session);
            if (!wallet) throw new Error('Wallet not found');

            const reversalAmount = -originalTx.amount;

            // Update Wallet
            wallet.balance += reversalAmount;
            await wallet.save({ session });

            // Create Reversal Ledger Entry
            await WalletTransaction.create([{
                walletId: wallet._id,
                type: TransactionType.ORDER_REVERSAL,
                amount: reversalAmount,
                referenceType: 'Order',
                referenceId: orderId,
                description: `Reversal for order #${orderId.toString().slice(-6)}`,
            }], { session });

            await session.commitTransaction();
            return { success: true };
        } catch (error: any) {
            await session.abortTransaction();
            console.error('Wallet Reversal Error:', error.message);
            return { success: false, message: error.message };
        } finally {
            session.endSession();
        }
    }

    /**
     * Get wallet balance and recent transactions
     */
    async getWalletSummary(livreurId: string) {
        const [wallet, settings] = await Promise.all([
            this.getOrCreateWallet(livreurId),
            this.getPlatformSettings()
        ]);

        const transactions = await WalletTransaction.find({ walletId: wallet._id })
            .sort({ createdAt: -1 })
            .limit(20);

        return {
            balance: wallet.balance,
            currency: wallet.currency,
            minimumPayoutAmount: settings.minimum_payout_amount,
            transactions
        };
    }
}

export default new WalletService();
