import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../../models/User';

// Helper to generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to validate Moroccan phone number
const validatePhone = (phone: string) => {
    const phoneRegex = /^(?:\+212|0)([5-7]\d{8})$/;
    return phoneRegex.test(phone);
};

/**
 * @desc    Request OTP for Login (Existing Users Only)
 * @route   POST /api/client/auth/login
 * @access  Public
 */
export const login = async (req: Request, res: Response) => {
    try {
        const { phoneNumber } = req.body;
        console.log(`[AUTH] Login Request received for: ${phoneNumber}`);

        if (!phoneNumber || !validatePhone(phoneNumber)) {
            console.warn(`[AUTH] Login Validation Failed: Invalid number format: ${phoneNumber}`);
            res.status(400).json({
                success: false,
                message: 'Veuillez fournir un numéro de téléphone valide (ex: 0612345678)'
            });
            return;
        }

        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        let user = await User.findOne({ phoneNumber });

        if (!user) {
            console.log(`[AUTH] Checking User: ${phoneNumber} -> NOT FOUND in database.`);
            console.warn(`[AUTH] Login Failed: User not found for number: ${phoneNumber}`);
            res.status(404).json({
                success: false,
                message: "Aucun compte trouvé avec ce numéro. Veuillez d'abord vous inscrire."
            });
            return;
        }

        console.log(`[AUTH] Checking User: ${phoneNumber} -> FOUND in database. Status: ${user.status}`);

        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        // --- Twilio Placeholder ---
        console.warn('[CONFIG] Twilio is not yet configured. OTP verification will use the mock code below.');
        console.log(`[TWILIO MOCK] Sending OTP ${otp} to ${phoneNumber}`);
        // -------------------------

        res.status(200).json({
            success: true,
            message: 'Code de vérification envoyé',
            ...(process.env.NODE_ENV === 'development' && { dev_otp: otp })
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Erreur Serveur' });
    }
};

/**
 * @desc    Verify OTP
 * @route   POST /api/client/auth/verify
 * @access  Public
 */
export const verifyOtp = async (req: Request, res: Response) => {
    try {
        const { phoneNumber, code } = req.body;
        console.log(`[AUTH] Verify OTP Request: Phone=${phoneNumber}, Code=${code}`);

        if (!phoneNumber || !code) {
            console.warn('[AUTH] Verify OTP Failed: Missing phone or code');
            res.status(400).json({ message: 'Numéro et code requis' });
            return;
        }

        const user = await User.findOne({
            phoneNumber,
            otp: code,
            otpExpires: { $gt: new Date() }
        }).select('+otp +otpExpires');

        if (!user) {
            console.warn(`[AUTH] Verify OTP Failed: Invalid or expired code for ${phoneNumber}`);
            res.status(400).json({ success: false, message: 'Code invalide ou expiré' });
            return;
        }

        // Clear OTP
        user.otp = undefined;
        user.otpExpires = undefined;
        user.isVerified = true;

        // NOTE: We no longer auto-activate the user here. 
        // Activation happens in updateProfile once they provide name/city.

        await user.save();

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, role: 'user' },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '30d' }
        );

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                phoneNumber: user.phoneNumber,
                name: user.name,
                city: user.city,
                status: user.status
            }
        });
    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ success: false, message: 'Erreur Serveur' });
    }
};

/**
 * @desc    Request OTP for Registration (New Users Only)
 * @route   POST /api/client/auth/register
 * @access  Public
 */
export const register = async (req: Request, res: Response) => {
    try {
        const { phoneNumber } = req.body;
        console.log(`[AUTH] Register Request received for: ${phoneNumber}`);

        if (!phoneNumber || !validatePhone(phoneNumber)) {
            console.warn(`[AUTH] Register Validation Failed: Invalid number format: ${phoneNumber}`);
            res.status(400).json({
                success: false,
                message: 'Veuillez fournir un numéro de téléphone valide'
            });
            return;
        }

        let user = await User.findOne({ phoneNumber });

        if (user) {
            console.log(`[AUTH] Checking User: ${phoneNumber} -> FOUND in database. Verified: ${user.isVerified}`);
        } else {
            console.log(`[AUTH] Checking User: ${phoneNumber} -> NOT FOUND in database (New user signup).`);
        }

        if (user && user.isVerified) {
            console.warn(`[AUTH] Register Failed: User already exists and is verified: ${phoneNumber}`);
            res.status(400).json({
                success: false,
                message: 'Ce numéro est déjà associé à un compte. Veuillez vous connecter.'
            });
            return;
        }

        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        if (!user) {
            user = await User.create({
                phoneNumber,
                otp,
                otpExpires,
                status: 'Pending'
            });
        } else {
            user.otp = otp;
            user.otpExpires = otpExpires;
            await user.save();
        }

        console.warn('[CONFIG] Twilio is not yet configured (Registration).');
        console.log(`[TWILIO MOCK] Sending Registration OTP ${otp} to ${phoneNumber}`);

        res.status(200).json({
            success: true,
            message: 'Code d\'inscription envoyé',
            ...(process.env.NODE_ENV === 'development' && { dev_otp: otp })
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Erreur Serveur' });
    }
};

/**
 * @desc    Update User Profile (Personal Information)
 * @route   PUT /api/client/auth/profile
 * @access  Private
 */
export const updateProfile = async (req: Request, res: Response) => {
    try {
        const { name, city } = req.body;
        const userId = (req as any).user.id;

        const user = await User.findById(userId);

        if (!user) {
            res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
            return;
        }

        if (!name || !city || !name.trim() || !city.trim()) {
            res.status(400).json({
                success: false,
                message: 'Le nom et la ville sont obligatoires.'
            });
            return;
        }

        user.name = name.trim();
        user.city = city.trim();

        // If they were pending, they are now active
        if (user.status === 'Pending') {
            user.status = 'Active';
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profil mis à jour',
            user: {
                id: user._id,
                phoneNumber: user.phoneNumber,
                name: user.name,
                city: user.city,
                status: user.status
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Erreur Serveur' });
    }
};

/**
 * @desc    Request phone number change
 * @route   POST /api/client/auth/phone-change/request
 * @access  Private
 */
export const requestPhoneChange = async (req: Request, res: Response) => {
    try {
        const { newPhoneNumber } = req.body;
        const userId = (req as any).user.id;

        if (!newPhoneNumber || !validatePhone(newPhoneNumber)) {
            res.status(400).json({
                success: false,
                message: 'Veuillez fournir un numéro de téléphone valide (ex: 0612345678)'
            });
            return;
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
            return;
        }

        // Check if new phone number is already in use
        const existingUser = await User.findOne({ phoneNumber: newPhoneNumber });
        if (existingUser && existingUser._id.toString() !== userId) {
            res.status(400).json({
                success: false,
                message: 'Ce numéro est déjà associé à un autre compte.'
            });
            return;
        }

        // Generate OTP
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.pendingPhoneNumber = newPhoneNumber;
        user.phoneChangeOtp = otp;
        user.phoneChangeOtpExpires = otpExpires;
        await user.save();

        // --- Twilio Placeholder ---
        console.warn('[CONFIG] Twilio is not yet configured. Phone change OTP will use the mock code below.');
        console.log(`[TWILIO MOCK] Sending Phone Change OTP ${otp} to ${newPhoneNumber}`);
        // -------------------------

        res.status(200).json({
            success: true,
            message: 'Code de vérification envoyé au nouveau numéro',
            ...(process.env.NODE_ENV === 'development' && { dev_otp: otp })
        });
    } catch (error) {
        console.error('Request phone change error:', error);
        res.status(500).json({ success: false, message: 'Erreur Serveur' });
    }
};

/**
 * @desc    Verify phone number change
 * @route   POST /api/client/auth/phone-change/verify
 * @access  Private
 */
export const verifyPhoneChange = async (req: Request, res: Response) => {
    try {
        const { newPhoneNumber, code } = req.body;
        const userId = (req as any).user.id;

        if (!newPhoneNumber || !code) {
            res.status(400).json({ success: false, message: 'Numéro et code requis' });
            return;
        }

        const user = await User.findById(userId).select('+phoneChangeOtp +phoneChangeOtpExpires');
        if (!user) {
            res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
            return;
        }

        // Verify OTP
        if (
            !user.phoneChangeOtp ||
            !user.phoneChangeOtpExpires ||
            user.phoneChangeOtp !== code ||
            user.phoneChangeOtpExpires < new Date() ||
            user.pendingPhoneNumber !== newPhoneNumber
        ) {
            res.status(400).json({ success: false, message: 'Code invalide ou expiré' });
            return;
        }

        // Update phone number
        user.phoneNumber = newPhoneNumber;
        user.pendingPhoneNumber = undefined;
        user.phoneChangeOtp = undefined;
        user.phoneChangeOtpExpires = undefined;
        await user.save();

        // Generate new JWT with updated phone number
        const token = jwt.sign(
            { id: user._id, role: 'user' },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '30d' }
        );

        res.status(200).json({
            success: true,
            message: 'Numéro de téléphone mis à jour avec succès',
            token,
            user: {
                id: user._id,
                phoneNumber: user.phoneNumber,
                name: user.name,
                city: user.city,
                status: user.status
            }
        });
    } catch (error) {
        console.error('Verify phone change error:', error);
        res.status(500).json({ success: false, message: 'Erreur Serveur' });
    }
};
