import { Request, Response } from 'express';
import PlatformSettings from '../../models/PlatformSettings';
import walletService from '../../services/walletService';
import WalletTransaction, { TransactionType } from '../../models/WalletTransaction';
import mongoose from 'mongoose';
import Wallet from '../../models/Wallet';

/**
 * Get platform settings
 */
export const getSettings = async (req: Request, res: Response) => {
    try {
        const settings = await walletService.getPlatformSettings();
        res.status(200).json({ success: true, settings });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update platform settings
 */
export const updateSettings = async (req: Request, res: Response) => {
    try {
        const { delivery_price_per_weight_unit, platform_margin_percentage, minimum_payout_amount } = req.body;

        let settings = await PlatformSettings.findOne();
        if (!settings) {
            settings = new PlatformSettings();
        }

        if (delivery_price_per_weight_unit !== undefined) settings.delivery_price_per_weight_unit = delivery_price_per_weight_unit;
        if (platform_margin_percentage !== undefined) settings.platform_margin_percentage = platform_margin_percentage;
        if (minimum_payout_amount !== undefined) settings.minimum_payout_amount = minimum_payout_amount;

        await settings.save();
        res.status(200).json({ success: true, settings });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Admin manual balance adjustment
 */
export const adjustBalance = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { livreurId, amount, description } = req.body;

        if (!livreurId || amount === undefined || amount === 0) {
            throw new Error('Invalid adjustment data');
        }

        const wallet = await walletService.getOrCreateWallet(livreurId, session);
        wallet.balance += amount;
        await wallet.save({ session });

        await WalletTransaction.create([{
            walletId: wallet._id,
            type: TransactionType.ADMIN_ADJUSTMENT,
            amount: amount,
            referenceType: 'Admin',
            referenceId: (req as any).user.id, // Admin who did the adjustment
            description: description || 'Admin manual adjustment',
        }], { session });

        await session.commitTransaction();
        res.status(200).json({ success: true, message: 'Balance adjusted successfully' });
    } catch (error: any) {
        await session.abortTransaction();
        res.status(400).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

/**
 * Get wallet by livreur ID (Admin only)
 */
export const getWalletByLivreur = async (req: Request, res: Response) => {
    try {
        const { livreurId } = req.params;
        const summary = await walletService.getWalletSummary(livreurId);
        res.status(200).json({ success: true, ...summary });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
