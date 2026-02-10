import { Request, Response } from 'express';
import walletService from '../../services/walletService';
import WalletTransaction from '../../models/WalletTransaction';
import mongoose from 'mongoose';

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
            throw new Error('Montant de retrait invalide');
        }

        const settings = await walletService.getPlatformSettings();
        if (amount < settings.minimum_payout_amount) {
            throw new Error(`Le montant minimum de retrait est de ${settings.minimum_payout_amount} MAD`);
        }

        const result = await walletService.requestWithdrawal(livreurId, amount);

        if (!result.success) {
            throw new Error(result.message || 'La demande de retrait a échoué');
        }

        res.status(200).json({
            success: true,
            message: 'Demande de retrait enregistrée avec succès'
        });
    } catch (error: any) {
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
                balance: (result as any).wallet?.balance
            });
        } else {
            res.status(500).json({ success: false, message: 'Erreur lors du rechargement.' });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
