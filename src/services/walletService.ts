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
                livreur: {
                    min_funds_withdrawal: 5000,
                    radius_max_km: 10,
                    min_rating_to_work: 4,
                    vehicle_limits: {
                        bike: { max_weight: 10, max_volume: 0.1 },
                        car: { max_weight: 100, max_volume: 1 },
                        truck: { max_weight: 1000, max_volume: 10 }
                    },
                    max_active_orders: 3
                },
                client: {
                    min_order_value: 5000,
                    first_order_discount: 1000,
                    referral_bonus_amount: 500,
                    support_target_minutes: 15,
                    free_delivery_threshold: 20000
                }
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
            if (order.status !== 'DELIVERED') throw new Error('Order is not completed');
            if (!order.livreurId) throw new Error('No livreur assigned to this order');

            // Check if payout already exists for this order
            const existingTx = await WalletTransaction.findOne({
                referenceType: 'Order',
                referenceId: order._id,
                type: TransactionType.ORDER_PAYOUT
            }).session(session);

            if (existingTx) throw new Error('Payout already processed for this order');

            const settings = await this.getPlatformSettings();

            // Check if margin was already deducted during acceptance
            const marginTx = await WalletTransaction.findOne({
                referenceType: 'Order',
                referenceId: order._id,
                type: TransactionType.MARGIN_DEDUCTION
            }).session(session);

            // Calculation logic
            const totalDeliveryFee = order.pricing.deliveryFee; // Livreur typically gets the delivery fee
            const netPayout = totalDeliveryFee;

            // If margin was NOT deducted during acceptance (old flow), deduct it now
            let finalPayout = netPayout;
            if (!marginTx) {
                const platformMargin = Math.round((order.pricing.subtotal * settings.platform_margin_percentage) / 100);
                finalPayout = netPayout - platformMargin;
            }

            // Update Wallet
            const wallet = await this.getOrCreateWallet(order.livreurId.toString(), session);
            wallet.balance += finalPayout;
            await wallet.save({ session });

            // Create Ledger Entry
            await WalletTransaction.create([{
                walletId: wallet._id,
                type: TransactionType.ORDER_PAYOUT,
                amount: finalPayout,
                referenceType: 'Order',
                referenceId: order._id,
                description: `Payout for order #${order._id.toString().slice(-6)}${!marginTx ? ' (Margin deducted at payout)' : ' (Margin already paid)'}`,
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
     * Top-up the livreur wallet
     */
    async topUpWallet(livreurId: string, amountDH: number, description?: string): Promise<{ success: boolean; wallet?: IWallet; message?: string }> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const amountCents = Math.round(amountDH * 100);
            const wallet = await this.getOrCreateWallet(livreurId, session);
            wallet.balance += amountCents;
            await wallet.save({ session });

            // Sync with Livreur model
            await mongoose.model('Livreur').findByIdAndUpdate(livreurId, {
                walletBalance: wallet.balance
            }).session(session);

            await WalletTransaction.create([{
                walletId: wallet._id,
                type: TransactionType.TOP_UP,
                amount: amountCents,
                referenceType: 'TopUp',
                referenceId: new mongoose.Types.ObjectId(),
                description: description || 'Recharge du compte',
            }], { session });

            await session.commitTransaction();
            return { success: true, wallet };
        } catch (error: any) {
            await session.abortTransaction();
            console.error('Wallet TopUp Error:', error.message);
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
            minFundsWithdrawal: settings.livreur?.min_funds_withdrawal || 0,
            transactions
        };
    }

    /**
     * Deducts platform margin from livreur wallet when an order is accepted.
     */
    async deductMarginForOrder(orderId: string, livreurId: string, session?: mongoose.ClientSession): Promise<{ success: boolean; message?: string }> {
        const internalSession = session || await mongoose.startSession();
        if (!session) internalSession.startTransaction();

        try {
            const [order, wallet] = await Promise.all([
                Order.findById(orderId).session(internalSession),
                this.getOrCreateWallet(livreurId, internalSession)
            ]);

            if (!order) throw new Error('Order not found');
            const marginAmount = Math.round((order.pricing.platformMargin || 0) * 100); // 1.2 MAD -> 120 cents

            if (wallet.balance < marginAmount) {
                throw new Error('Solde insuffisant pour accepter cette commande');
            }

            // Deduct from wallet
            wallet.balance -= marginAmount;
            await wallet.save({ session: internalSession });

            // Sync with Livreur model
            await (mongoose.model('Livreur')).findByIdAndUpdate(livreurId, {
                walletBalance: wallet.balance
            }).session(internalSession);

            // Create Transaction Record
            await WalletTransaction.create([{
                walletId: wallet._id,
                type: TransactionType.MARGIN_DEDUCTION,
                amount: -marginAmount,
                referenceType: 'Order',
                referenceId: order._id,
                description: `Commission Sala pour commande #${order._id.toString().slice(-6)}`,
            }], { session: internalSession });

            if (!session) await (internalSession as mongoose.ClientSession).commitTransaction();
            return { success: true };
        } catch (error: any) {
            if (!session) await (internalSession as mongoose.ClientSession).abortTransaction();
            console.error('Margin Deduction Error:', error.message);
            return { success: false, message: error.message };
        } finally {
            if (!session) internalSession.endSession();
        }
    }


}

export default new WalletService();
