import { Request, Response } from 'express';
import walletService from '../../services/walletService';
import WalletTransaction, { TransactionType } from '../../models/WalletTransaction';
import mongoose from 'mongoose';
import Wallet from '../../models/Wallet';

/**
 * Get current livreur's wallet summary (balance + recent transactions)
 */
export const getWalletSummary = async (req: Request, res: Response) => {
    try {
        const livreurId = (req as any).user.id;
        const summary = await walletService.getWalletSummary(livreurId);

        res.status(200).json({
            success: true,
            ...summary
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get detailed transaction history for the current livreur
 */
export const getTransactionHistory = async (req: Request, res: Response) => {
    try {
        const livreurId = (req as any).user.id;
        const wallet = await walletService.getOrCreateWallet(livreurId);

        const transactions = await WalletTransaction.find({ walletId: wallet._id })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            transactions
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Request a withdrawal from the wallet
 */
export const requestWithdrawal = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const livreurId = (req as any).user.id;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            throw new Error('Invalid withdrawal amount');
        }

        const settings = await walletService.getPlatformSettings();
        if (amount < settings.minimum_payout_amount) {
            throw new Error(`Minimum withdrawal amount is ${settings.minimum_payout_amount / 100} MAD`);
        }

        const wallet = await walletService.getOrCreateWallet(livreurId, session);
        if (wallet.balance < amount) {
            throw new Error('Insufficient balance');
        }

        // Atomically deduct balance
        wallet.balance -= amount;
        await wallet.save({ session });

        // Create Withdrawal Ledger Entry
        await WalletTransaction.create([{
            walletId: wallet._id,
            type: TransactionType.WITHDRAWAL,
            amount: -amount,
            referenceType: 'Withdrawal',
            referenceId: new mongoose.Types.ObjectId(), // Placeholder for actual withdrawal record if needed
            description: 'Withdrawal request initiated',
        }], { session });

        await session.commitTransaction();
        res.status(200).json({
            success: true,
            message: 'Withdrawal request initiated successfully'
        });
    } catch (error: any) {
        await session.abortTransaction();
        res.status(400).json({
            success: false,
            message: error.message
        });
    } finally {
        session.endSession();
    }
};

/**
 * Top-up the livreur wallet (Directly for now, should integrate gateway later)
 */
export const topUpWallet = async (req: Request, res: Response) => {
    try {
        const livreurId = (req as any).user.id;
        const { amount, description } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Montant invalide.' });
        }

        const result = await walletService.topUpWallet(livreurId, amount, description);

        if (result.success) {
            res.status(200).json({
                success: true,
                message: 'Compte rechargé avec succès.',
                balance: result.wallet?.balance
            });
        } else {
            res.status(500).json({ success: false, message: 'Erreur lors du rechargement.' });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
