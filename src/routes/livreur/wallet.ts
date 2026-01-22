import { Router } from 'express';
import * as walletController from '../../controllers/livreur/walletController';
import { protect } from '../../middleware/auth';

const router = Router();

router.use(protect); // All wallet routes require authentication

router.get('/', walletController.getWalletSummary);
router.get('/transactions', walletController.getTransactionHistory);
router.post('/withdraw', walletController.requestWithdrawal);
router.post('/topup', walletController.topUpWallet);

export default router;
