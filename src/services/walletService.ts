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
                delivery_price_per_weight_unit: 10,
                weight_unit_kg: 1,
                platform_margin_percentage: 15,
                minimum_payout_amount: 50,
                tax_percentage: 20,
                livreur: {
                    min_funds_withdrawal: 50,
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
                    min_order_value: 50,
                    first_order_discount: 10,
                    referral_bonus_amount: 5,
                    support_target_minutes: 15,
                    free_delivery_threshold: 200
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
     */
    async creditWalletForOrder(orderId: string, session?: mongoose.ClientSession): Promise<{ success: boolean; message?: string }> {
        const internalSession = session || await mongoose.startSession();
        if (!session) internalSession.startTransaction();

        try {
            const order = await Order.findById(orderId).session(internalSession);
            if (!order) throw new Error('Order not found');
            if (order.status !== 'DELIVERED') throw new Error('Order is not completed');
            if (!order.livreurId) throw new Error('No livreur assigned to this order');

            // Check if payout already exists for this order
            const existingTx = await WalletTransaction.findOne({
                referenceId: order._id,
                type: TransactionType.ORDER_PAYOUT
            }).session(internalSession);

            if (existingTx) throw new Error('Payout already processed for this order');

            const settings = await this.getPlatformSettings();

            // Check if margin was already deducted during acceptance
            const marginTx = await WalletTransaction.findOne({
                referenceId: order._id,
                type: TransactionType.MARGIN_DEDUCTION
            }).session(internalSession);

            // Calculation logic
            const totalDeliveryFee = order.pricing.deliveryFee;
            const netPayout = totalDeliveryFee;

            // If margin was NOT deducted during acceptance (old flow), deduct it now
            let finalPayout = netPayout;
            if (!marginTx) {
                const platformMargin = parseFloat((order.pricing.subtotal * settings.platform_margin_percentage / 100).toFixed(2));
                finalPayout = netPayout - platformMargin;
            }

            // Update Wallet
            const wallet = await this.getOrCreateWallet(order.livreurId.toString(), internalSession);
            wallet.balance = parseFloat((wallet.balance + finalPayout).toFixed(2));
            await wallet.save({ session: internalSession });

            // Sync with Livreur model
            await (mongoose.model('Livreur')).findByIdAndUpdate(order.livreurId, {
                walletBalance: wallet.balance
            }).session(internalSession);

            // Create Ledger Entry
            await WalletTransaction.create([{
                walletId: wallet._id,
                type: TransactionType.ORDER_PAYOUT,
                amount: finalPayout,
                referenceType: 'Order',
                referenceId: order._id,
                description: `Payout for order #${order._id.toString().slice(-6)}${!marginTx ? ' (Margin deducted at payout)' : ' (Margin already paid)'}`,
            }], { session: internalSession });

            if (!session) await (internalSession as mongoose.ClientSession).commitTransaction();
            return { success: true };
        } catch (error: any) {
            if (!session) await (internalSession as mongoose.ClientSession).abortTransaction();
            console.error('Wallet Credit Error:', error.message);
            return { success: false, message: error.message };
        } finally {
            if (!session) internalSession.endSession();
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
                referenceId: orderId,
                type: TransactionType.ORDER_PAYOUT
            }).session(session);

            if (!originalTx) throw new Error('No payout found for this order');

            // Check if already reversed
            const existingReversal = await WalletTransaction.findOne({
                referenceId: orderId,
                type: TransactionType.ORDER_REVERSAL
            }).session(session);

            if (existingReversal) throw new Error('Payout already reversed');

            const wallet = await Wallet.findById(originalTx.walletId).session(session);
            if (!wallet) throw new Error('Wallet not found');

            const reversalAmount = -originalTx.amount;

            // Update Wallet
            wallet.balance = parseFloat((wallet.balance + reversalAmount).toFixed(2));
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
            const wallet = await this.getOrCreateWallet(livreurId, session);
            wallet.balance = parseFloat((wallet.balance + amountDH).toFixed(2));
            await wallet.save({ session });

            // Sync with Livreur model
            await mongoose.model('Livreur').findByIdAndUpdate(livreurId, {
                walletBalance: wallet.balance
            }).session(session);

            await WalletTransaction.create([{
                walletId: wallet._id,
                type: TransactionType.TOP_UP,
                amount: amountDH,
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
            .limit(5);

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
            const marginAmount = order.pricing.platformMargin || 0; // Now in DH

            if (wallet.balance < marginAmount) {
                throw new Error('Solde insuffisant pour accepter cette commande');
            }

            // Deduct from wallet
            wallet.balance = parseFloat((wallet.balance - marginAmount).toFixed(2));
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

    /**
     * Deducts a penalty from the livreur wallet (e.g., for cancellation).
     */
    async deductPenaltyForOrder(orderId: string, livreurId: string, penaltyAmountDH: number, session?: mongoose.ClientSession): Promise<{ success: boolean; message?: string }> {
        const internalSession = session || await mongoose.startSession();
        if (!session) internalSession.startTransaction();

        try {
            const wallet = await this.getOrCreateWallet(livreurId, internalSession);

            // Deduct from wallet
            wallet.balance = parseFloat((wallet.balance - penaltyAmountDH).toFixed(2));
            await wallet.save({ session: internalSession });

            // Sync with Livreur model
            await (mongoose.model('Livreur')).findByIdAndUpdate(livreurId, {
                walletBalance: wallet.balance
            }).session(internalSession);

            // Create Transaction Record
            await WalletTransaction.create([{
                walletId: wallet._id,
                type: TransactionType.ORDER_REVERSAL, // Or use ADMIN_ADJUSTMENT if PENALTY not in enum
                amount: -penaltyAmountDH,
                referenceType: 'Order',
                referenceId: new mongoose.Types.ObjectId(orderId),
                description: `Pénalité d'annulation pour commande #${orderId.toString().slice(-6)}`,
            }], { session: internalSession });

            if (!session) await (internalSession as mongoose.ClientSession).commitTransaction();
            return { success: true };
        } catch (error: any) {
            if (!session) await (internalSession as mongoose.ClientSession).abortTransaction();
            console.error('Penalty Deduction Error:', error.message);
            return { success: false, message: error.message };
        } finally {
            if (!session) internalSession.endSession();
        }
    }
}

export default new WalletService();
