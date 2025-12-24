import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILivreur extends Document {
    phoneNumber: string;
    name?: string;
    city?: string;
    otp?: string;
    otpExpires?: Date;
    isVerified: boolean;
    status: 'Pending' | 'Active' | 'Inactive' | 'Suspended';

    // Registration workflow fields
    registrationStep: 'phone_verification' | 'basic_info' | 'documents' | 'vehicle_photos' | 'vehicle_papers' | 'selfie' | 'completed';

    // Basic information
    email?: string;
    dateOfBirth?: Date;
    address?: string;

    // Vehicle information
    vehicle: {
        type: 'moto' | 'small_car' | 'large_car';
        model: string;
        plateNumber: string;
    };

    // Document verification
    documents: {
        cin: {
            frontUrl?: string;
            backUrl?: string;
            verified: boolean;
        };
        drivingLicense: {
            frontUrl?: string;
            backUrl?: string;
            verified: boolean;
        };
        vehicleRegistration: {
            frontUrl?: string;
            backUrl?: string;
            verified: boolean;
        };
        insurance: {
            url?: string;
            verified: boolean;
        };
        vehiclePhoto: {
            frontUrl?: string; // Selfie with vehicle
            plateUrl?: string; // Photo of plate
            verified: boolean;
        };
    };

    // Selfie verification
    selfie: {
        url?: string;
        verified: boolean;
    };

    // Phone change functionality
    pendingPhoneNumber?: string;
    phoneChangeOtp?: string;
    phoneChangeOtpExpires?: Date;

    // Notifications
    notifications: Array<{
        title: string;
        message: string;
        type: 'Order' | 'Finance' | 'Compliance' | 'General';
        isRead: boolean;
        createdAt: Date;
    }>;

    // Support/Complaints
    complaints: Array<{
        subject: string;
        category: 'Réclamation' | 'Plaintes' | 'Questions' | 'Autres';
        status: 'Open' | 'Resolved' | 'In Progress';
        requesterInfo: {
            name: string;
            phoneNumber: string;
            city: string;
        };
        messages: Array<{
            sender: 'User' | 'Support';
            text: string;
            createdAt: Date;
        }>;
        createdAt: Date;
    }>;

    createdAt: Date;
    updatedAt: Date;
}

const LivreurSchema: Schema = new Schema(
    {
        phoneNumber: {
            type: String,
            required: [true, 'Please provide a phone number'],
            unique: true,
            trim: true,
        },
        name: {
            type: String,
            trim: true,
            maxlength: [50, 'Name cannot be more than 50 characters'],
        },
        city: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
        },
        dateOfBirth: {
            type: Date,
        },
        address: {
            type: String,
            trim: true,
        },
        otp: {
            type: String,
            select: false,
        },
        otpExpires: {
            type: Date,
            select: false,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ['Pending', 'Active', 'Inactive', 'Suspended'],
            default: 'Pending',
        },
        registrationStep: {
            type: String,
            enum: ['phone_verification', 'basic_info', 'documents', 'vehicle_photos', 'vehicle_papers', 'selfie', 'completed'],
            default: 'phone_verification',
        },
        vehicle: {
            type: {
                type: String,
                enum: ['moto', 'small_car', 'large_car'],
            },
            model: String,
            plateNumber: String,
        },
        documents: {
            cin: {
                frontUrl: String,
                backUrl: String,
                verified: { type: Boolean, default: false },
            },
            drivingLicense: {
                frontUrl: String,
                backUrl: String,
                verified: { type: Boolean, default: false },
            },
            vehicleRegistration: {
                frontUrl: String,
                backUrl: String,
                verified: { type: Boolean, default: false },
            },
            insurance: {
                url: String,
                verified: { type: Boolean, default: false },
            },
            vehiclePhoto: {
                frontUrl: String, // Selfie with vehicle
                plateUrl: String, // Photo of plate
                verified: { type: Boolean, default: false },
            }
        },
        selfie: {
            url: String,
            verified: { type: Boolean, default: false },
        },
        pendingPhoneNumber: {
            type: String,
            trim: true,
        },
        phoneChangeOtp: {
            type: String,
            select: false,
        },
        phoneChangeOtpExpires: {
            type: Date,
            select: false,
        },
        notifications: [
            {
                title: String,
                message: String,
                type: { type: String, enum: ['Order', 'Finance', 'Compliance', 'General'], default: 'General' },
                isRead: { type: Boolean, default: false },
                createdAt: { type: Date, default: Date.now },
            }
        ],
        complaints: [
            {
                subject: String,
                category: {
                    type: String,
                    enum: ['Réclamation', 'Plaintes', 'Questions', 'Autres'],
                    default: 'Autres'
                },
                status: { type: String, enum: ['Open', 'Resolved', 'In Progress'], default: 'Open' },
                requesterInfo: {
                    name: String,
                    phoneNumber: String,
                    city: String,
                },
                messages: [
                    {
                        sender: { type: String, enum: ['User', 'Support'] },
                        text: String,
                        createdAt: { type: Date, default: Date.now },
                    }
                ],
                createdAt: { type: Date, default: Date.now },
            }
        ],
    },
    {
        timestamps: true,
        collection: 'Livreurs',
    }
);

const Livreur: Model<ILivreur> = mongoose.models.Livreur || mongoose.model<ILivreur>('Livreur', LivreurSchema);

export default Livreur;
