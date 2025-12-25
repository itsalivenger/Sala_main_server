import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Livreur from '../../models/Livreur';
import smsService from '../../services/smsService';

// Helper to generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to validate Moroccan phone number (format: 0[5-7]XXXXXXXX)
const validatePhone = (phone: string) => {
    const phoneRegex = /^0[5-7]\d{8}$/;
    return phoneRegex.test(phone);
};

/**
 * @desc    Request OTP for Login (Existing Livreurs Only)
 * @route   POST /api/livreur/auth/login
 * @access  Public
 */
export const login = async (req: Request, res: Response) => {
    try {
        const { phoneNumber } = req.body;
        console.log(`[LIVREUR AUTH] Login Request received for: ${phoneNumber}`);

        if (!phoneNumber || !validatePhone(phoneNumber)) {
            console.warn(`[LIVREUR AUTH] Login Validation Failed: Invalid number format: ${phoneNumber}`);
            res.status(400).json({
                success: false,
                message: 'Veuillez fournir un numéro de téléphone valide (ex: 0612345678)'
            });
            return;
        }

        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        let livreur = await Livreur.findOne({ phoneNumber });

        if (!livreur) {
            console.log(`[LIVREUR AUTH] Checking Livreur: ${phoneNumber} -> NOT FOUND in database.`);
            console.warn(`[LIVREUR AUTH] Login Failed: Livreur not found for number: ${phoneNumber}`);
            res.status(404).json({
                success: false,
                message: "Aucun compte livreur trouvé avec ce numéro. Veuillez d'abord vous inscrire."
            });
            return;
        }

        console.log(`[LIVREUR AUTH] Checking Livreur: ${phoneNumber} -> FOUND in database. Status: ${livreur.status}`);

        livreur.otp = otp;
        livreur.otpExpires = otpExpires;
        await livreur.save();

        // Send OTP via SMS (Twilio or mock)
        await smsService.sendOTP(phoneNumber, otp, 'Livreur Login');

        res.status(200).json({
            success: true,
            message: 'Code de vérification envoyé',
            ...(process.env.NODE_ENV === 'development' && { dev_otp: otp })
        });
    } catch (error) {
        console.error('Livreur Login error:', error);
        res.status(500).json({ success: false, message: 'Erreur Serveur' });
    }
};

/**
 * @desc    Verify OTP for Login
 * @route   POST /api/livreur/auth/verify
 * @access  Public
 */
export const verifyOtp = async (req: Request, res: Response) => {
    try {
        const { phoneNumber, code } = req.body;
        console.log(`[LIVREUR AUTH] Verify OTP Request: Phone=${phoneNumber}, Code=${code}`);

        if (!phoneNumber || !code) {
            console.warn('[LIVREUR AUTH] Verify OTP Failed: Missing phone or code');
            res.status(400).json({ message: 'Numéro et code requis' });
            return;
        }

        const livreur = await Livreur.findOne({
            phoneNumber,
            otp: code,
            otpExpires: { $gt: new Date() }
        }).select('+otp +otpExpires');

        if (!livreur) {
            console.warn(`[LIVREUR AUTH] Verify OTP Failed: Invalid or expired code for ${phoneNumber}`);
            res.status(400).json({ success: false, message: 'Code invalide ou expiré' });
            return;
        }

        // Clear OTP
        livreur.otp = undefined;
        livreur.otpExpires = undefined;
        livreur.isVerified = true;
        await livreur.save();

        // Generate JWT
        const token = jwt.sign(
            { id: livreur._id, role: 'livreur' },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '30d' }
        );

        res.status(200).json({
            success: true,
            token,
            livreur: {
                id: livreur._id,
                phoneNumber: livreur.phoneNumber,
                name: livreur.name,
                city: livreur.city,
                status: livreur.status,
                registrationStep: livreur.registrationStep
            }
        });
    } catch (error) {
        console.error('Livreur Verify error:', error);
        res.status(500).json({ success: false, message: 'Erreur Serveur' });
    }
};

/**
 * @desc    Request OTP for Registration (New Livreurs Only)
 * @route   POST /api/livreur/auth/register
 * @access  Public
 */
export const register = async (req: Request, res: Response) => {
    try {
        const { phoneNumber } = req.body;
        console.log(`[LIVREUR AUTH] Register Request received for: ${phoneNumber}`);

        if (!phoneNumber || !validatePhone(phoneNumber)) {
            console.warn(`[LIVREUR AUTH] Register Validation Failed: Invalid number format: ${phoneNumber}`);
            res.status(400).json({
                success: false,
                message: 'Veuillez fournir un numéro de téléphone valide'
            });
            return;
        }

        let livreur = await Livreur.findOne({ phoneNumber });

        if (livreur) {
            console.log(`[LIVREUR AUTH] Checking Livreur: ${phoneNumber} -> FOUND in database. Verified: ${livreur.isVerified}`);
        } else {
            console.log(`[LIVREUR AUTH] Checking Livreur: ${phoneNumber} -> NOT FOUND in database (New livreur signup).`);
        }

        if (livreur && livreur.isVerified) {
            console.warn(`[LIVREUR AUTH] Register Failed: Livreur already exists and is verified: ${phoneNumber}`);
            res.status(400).json({
                success: false,
                message: 'Ce numéro est déjà associé à un compte livreur. Veuillez vous connecter.'
            });
            return;
        }

        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        if (!livreur) {
            livreur = await Livreur.create({
                phoneNumber,
                otp,
                otpExpires,
                status: 'Pending',
                registrationStep: 'phone_verification'
            });
        } else {
            livreur.otp = otp;
            livreur.otpExpires = otpExpires;
            await livreur.save();
        }

        // Send OTP via SMS (Twilio or mock)
        await smsService.sendOTP(phoneNumber, otp, 'Livreur Registration');

        res.status(200).json({
            success: true,
            message: 'Code d\'inscription envoyé',
            ...(process.env.NODE_ENV === 'development' && { dev_otp: otp })
        });
    } catch (error) {
        console.error('Livreur Register error:', error);
        res.status(500).json({ success: false, message: 'Erreur Serveur' });
    }
};

/**
 * @desc    Update Livreur Basic Info
 * @route   PUT /api/livreur/auth/profile/basic-info
 * @access  Private
 */
export const updateBasicInfo = async (req: Request, res: Response) => {
    try {
        const { name, city, email, dateOfBirth, address, vehicleType, vehicleModel } = req.body;
        const livreurId = (req as any).user.id;

        const livreur = await Livreur.findById(livreurId);

        if (!livreur) {
            res.status(404).json({ success: false, message: 'Livreur non trouvé' });
            return;
        }

        if (!name || !city || !name.trim() || !city.trim()) {
            res.status(400).json({
                success: false,
                message: 'Le nom et la ville sont obligatoires.'
            });
            return;
        }

        livreur.name = name.trim();
        livreur.city = city.trim();

        if (email) livreur.email = email.trim();
        if (dateOfBirth) livreur.dateOfBirth = new Date(dateOfBirth);
        if (address) livreur.address = address.trim();

        // Update Vehicle Info
        if (vehicleType || vehicleModel) {
            if (!livreur.vehicle) {
                livreur.vehicle = {} as any;
            }
            if (vehicleType) livreur.vehicle.type = vehicleType;
            if (vehicleModel) livreur.vehicle.model = vehicleModel;
        }

        // Progress registration step
        if (livreur.registrationStep === 'phone_verification') {
            livreur.registrationStep = 'basic_info';
        }

        await livreur.save();

        res.status(200).json({
            success: true,
            message: 'Informations de base mises à jour',
            livreur: {
                id: livreur._id,
                phoneNumber: livreur.phoneNumber,
                name: livreur.name,
                city: livreur.city,
                email: livreur.email,
                status: livreur.status,
                registrationStep: livreur.registrationStep,
                vehicle: livreur.vehicle
            }
        });
    } catch (error) {
        console.error('Update basic info error:', error);
        res.status(500).json({ success: false, message: 'Erreur Serveur' });
    }
};

/**
 * @desc    Update Livreur Documents (Mock for now)
 * @route   PUT /api/livreur/auth/profile/documents
 * @access  Private
 */
export const updateDocuments = async (req: Request, res: Response) => {
    try {
        const { cinFront, cinBack, licenseFront, licenseBack } = req.body;
        const livreurId = (req as any).user.id;

        const livreur = await Livreur.findById(livreurId);

        if (!livreur) {
            res.status(404).json({ success: false, message: 'Livreur non trouvé' });
            return;
        }

        // Initialize documents if undefined
        if (!livreur.documents) {
            livreur.documents = {} as any;
        }
        if (!livreur.documents.cin) livreur.documents.cin = {} as any;
        if (!livreur.documents.drivingLicense) livreur.documents.drivingLicense = {} as any;

        if (cinFront) livreur.documents.cin.frontUrl = cinFront;
        if (cinBack) livreur.documents.cin.backUrl = cinBack;
        if (licenseFront) livreur.documents.drivingLicense.frontUrl = licenseFront;
        if (licenseBack) livreur.documents.drivingLicense.backUrl = licenseBack;

        if (livreur.registrationStep === 'basic_info') {
            livreur.registrationStep = 'documents';
        }

        await livreur.save();

        res.status(200).json({
            success: true,
            message: 'Documents téléchargés avec succès',
            livreur: {
                id: livreur._id,
                registrationStep: livreur.registrationStep,
                documents: livreur.documents
            }
        });
    } catch (error) {
        console.error('Update documents error:', error);
        res.status(500).json({ success: false, message: 'Erreur Serveur' });
    }
};

/**
 * @desc    Update Vehicle Photos (Selfie w/ Car + Plate)
 * @route   PUT /api/livreur/auth/profile/vehicle-photos
 * @access  Private
 */
export const updateVehiclePhotos = async (req: Request, res: Response) => {
    try {
        const { selfieWithVehicle, platePhoto, plateNumber } = req.body;
        const livreurId = (req as any).user.id;

        const livreur = await Livreur.findById(livreurId);

        if (!livreur) {
            res.status(404).json({ success: false, message: 'Livreur non trouvé' });
            return;
        }

        // Initialize vehicles/documents if undefined
        if (!livreur.vehicle) livreur.vehicle = {} as any;
        if (!livreur.documents) livreur.documents = {} as any;
        if (!livreur.documents.vehiclePhoto) livreur.documents.vehiclePhoto = {} as any;

        if (plateNumber) livreur.vehicle.plateNumber = plateNumber;
        if (selfieWithVehicle) livreur.documents.vehiclePhoto.frontUrl = selfieWithVehicle;
        if (platePhoto) livreur.documents.vehiclePhoto.plateUrl = platePhoto;

        if (livreur.registrationStep === 'documents') {
            livreur.registrationStep = 'vehicle_photos';
        }

        await livreur.save();

        res.status(200).json({
            success: true,
            message: 'Photos du véhicule enregistrées',
            livreur: {
                id: livreur._id,
                vehicle: livreur.vehicle,
                documents: livreur.documents,
                registrationStep: livreur.registrationStep
            }
        });
    } catch (error) {
        console.error('Update vehicle photos error:', error);
        res.status(500).json({ success: false, message: 'Erreur Serveur' });
    }
};

/**
 * @desc    Update Vehicle Papers (Gray Card + Insurance)
 * @route   PUT /api/livreur/auth/profile/vehicle-papers
 * @access  Private
 */
export const updateVehiclePapers = async (req: Request, res: Response) => {
    try {
        const { grayCardFront, grayCardBack, insurance } = req.body;
        const livreurId = (req as any).user.id;

        const livreur = await Livreur.findById(livreurId);

        if (!livreur) {
            res.status(404).json({ success: false, message: 'Livreur non trouvé' });
            return;
        }

        // Initialize documents if undefined
        if (!livreur.documents) livreur.documents = {} as any;
        if (!livreur.documents.vehicleRegistration) livreur.documents.vehicleRegistration = {} as any;
        if (!livreur.documents.insurance) livreur.documents.insurance = {} as any;

        if (grayCardFront) livreur.documents.vehicleRegistration.frontUrl = grayCardFront;
        if (grayCardBack) livreur.documents.vehicleRegistration.backUrl = grayCardBack;
        if (insurance) livreur.documents.insurance.url = insurance;

        if (livreur.registrationStep === 'vehicle_photos') {
            livreur.registrationStep = 'vehicle_papers';
        }

        await livreur.save();

        res.status(200).json({
            success: true,
            message: 'Papiers du véhicule enregistrés',
            livreur: {
                id: livreur._id,
                documents: livreur.documents,
                registrationStep: livreur.registrationStep
            }
        });
    } catch (error) {
        console.error('Update vehicle papers error:', error);
        res.status(500).json({ success: false, message: 'Erreur Serveur' });
    }
};

/**
 * @desc    Update Livreur Selfie (Mock for now)
 * @route   PUT /api/livreur/auth/profile/selfie
 * @access  Private
 */
export const updateSelfie = async (req: Request, res: Response) => {
    try {
        const { selfieUrl } = req.body;
        const livreurId = (req as any).user.id;

        const livreur = await Livreur.findById(livreurId);

        if (!livreur) {
            res.status(404).json({ success: false, message: 'Livreur non trouvé' });
            return;
        }

        if (!selfieUrl) {
            res.status(400).json({ success: false, message: 'Selfie requis' });
            return;
        }

        livreur.selfie.url = selfieUrl;

        // Complete registration
        if (livreur.registrationStep === 'vehicle_papers') {
            livreur.registrationStep = 'completed';
            // Status remains 'Pending' until admin approves
        }

        await livreur.save();

        res.status(200).json({
            success: true,
            message: 'Selfie téléchargé avec succès. Votre compte est en attente d\'approbation.',
            livreur: {
                id: livreur._id,
                registrationStep: livreur.registrationStep,
                status: livreur.status
            }
        });
    } catch (error) {
        console.error('Update selfie error:', error);
        res.status(500).json({ success: false, message: 'Erreur Serveur' });
    }
};

/**
 * @desc    Get Livreur Profile
 * @route   GET /api/livreur/auth/profile
 * @access  Private
 */
export const getProfile = async (req: Request, res: Response) => {
    try {
        const livreurId = (req as any).user.id;

        const livreur = await Livreur.findById(livreurId);

        if (!livreur) {
            res.status(404).json({ success: false, message: 'Livreur non trouvé' });
            return;
        }

        res.status(200).json({
            success: true,
            livreur: {
                id: livreur._id,
                phoneNumber: livreur.phoneNumber,
                name: livreur.name,
                city: livreur.city,
                email: livreur.email,
                dateOfBirth: livreur.dateOfBirth,
                address: livreur.address,
                status: livreur.status,
                registrationStep: livreur.registrationStep,
                vehicle: livreur.vehicle,
                documents: livreur.documents,
                selfie: livreur.selfie,
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Erreur Serveur' });
    }
};

/**
 * @desc    Get All Complaints for Livreur
 * @route   GET /api/livreur/auth/complaints
 * @access  Private
 */
export const getComplaints = async (req: Request, res: Response) => {
    try {
        const livreurId = (req as any).user.id;

        const livreur = await Livreur.findById(livreurId);

        if (!livreur) {
            res.status(404).json({ success: false, message: 'Livreur non trouvé' });
            return;
        }

        res.status(200).json({
            success: true,
            complaints: livreur.complaints || []
        });
    } catch (error) {
        console.error('Get complaints error:', error);
        res.status(500).json({ success: false, message: 'Erreur Serveur' });
    }
};

/**
 * @desc    Create New Complaint
 * @route   POST /api/livreur/auth/complaints
 * @access  Private
 */
export const createComplaint = async (req: Request, res: Response) => {
    try {
        const { subject, category, message } = req.body;
        const livreurId = (req as any).user.id;

        if (!subject || !category || !message) {
            res.status(400).json({ success: false, message: 'Sujet, catégorie et message requis' });
            return;
        }

        const livreur = await Livreur.findById(livreurId);

        if (!livreur) {
            res.status(404).json({ success: false, message: 'Livreur non trouvé' });
            return;
        }

        const newComplaint = {
            subject: subject.trim(),
            category,
            status: 'Open',
            requesterInfo: {
                name: livreur.name || 'Non renseigné',
                phoneNumber: livreur.phoneNumber,
                city: livreur.city || 'Non renseigné'
            },
            messages: [{
                sender: 'User',
                text: message.trim(),
                createdAt: new Date()
            }],
            createdAt: new Date()
        };

        if (!livreur.complaints) {
            livreur.complaints = [];
        }

        livreur.complaints.push(newComplaint as any);
        await livreur.save();

        res.status(201).json({
            success: true,
            message: 'Réclamation créée avec succès',
            complaint: newComplaint
        });
    } catch (error) {
        console.error('Create complaint error:', error);
        res.status(500).json({ success: false, message: 'Erreur Serveur' });
    }
};

/**
 * @desc    Get Complaint by ID
 * @route   GET /api/livreur/auth/complaints/:id
 * @access  Private
 */
export const getComplaintById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const livreurId = (req as any).user.id;

        const livreur = await Livreur.findById(livreurId);

        if (!livreur) {
            res.status(404).json({ success: false, message: 'Livreur non trouvé' });
            return;
        }

        const complaint = livreur.complaints?.find((c: any) => c._id.toString() === id);

        if (!complaint) {
            res.status(404).json({ success: false, message: 'Réclamation non trouvée' });
            return;
        }

        res.status(200).json({
            success: true,
            complaint
        });
    } catch (error) {
        console.error('Get complaint by ID error:', error);
        res.status(500).json({ success: false, message: 'Erreur Serveur' });
    }
};

/**
 * @desc    Add Message to Complaint
 * @route   POST /api/livreur/auth/complaints/:id/messages
 * @access  Private
 */
export const addComplaintMessage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        const livreurId = (req as any).user.id;

        if (!text || !text.trim()) {
            res.status(400).json({ success: false, message: 'Message requis' });
            return;
        }

        const livreur = await Livreur.findById(livreurId);

        if (!livreur) {
            res.status(404).json({ success: false, message: 'Livreur non trouvé' });
            return;
        }

        const complaint = livreur.complaints?.find((c: any) => c._id.toString() === id);

        if (!complaint) {
            res.status(404).json({ success: false, message: 'Réclamation non trouvée' });
            return;
        }

        const newMessage = {
            sender: 'User',
            text: text.trim(),
            createdAt: new Date()
        };

        complaint.messages.push(newMessage as any);
        await livreur.save();

        res.status(200).json({
            success: true,
            message: 'Message ajouté',
            newMessage
        });
    } catch (error) {
        console.error('Add complaint message error:', error);
        res.status(500).json({ success: false, message: 'Erreur Serveur' });
    }
};
