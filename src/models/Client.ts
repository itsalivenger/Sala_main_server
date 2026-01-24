import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClient extends Document {
    phoneNumber: string;
    email?: string;
    name?: string;
    city?: string;
    otp?: string;
    otpExpires?: Date;
    isVerified: boolean;
    status: 'Active' | 'Inactive' | 'Pending' | 'Suspended';
    lastLogin?: Date;
    lastConnected?: Date;
    address?: string;
    pendingPhoneNumber?: string;
    phoneChangeOtp?: string;
    phoneChangeOtpExpires?: Date;
    pushToken?: string;
    notifications: Array<{
        title: string;
        message: string;
        type: 'Order' | 'Finance' | 'Compliance' | 'General';
        isRead: boolean;
        createdAt: Date;
    }>;
    complaints: Array<{
        subject: string;
        category: 'Réclamation' | 'Questions' | 'Autres';
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
    lastPosition?: {
        lat: number;
        lng: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

const ClientSchema: Schema = new Schema(
    {
        phoneNumber: {
            type: String,
            required: [true, 'Please provide a phone number'],
            unique: true,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
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
            enum: ['Active', 'Inactive', 'Pending', 'Suspended'],
            default: 'Pending',
        },
        lastLogin: {
            type: Date,
        },
        lastConnected: {
            type: Date,
        },
        address: {
            type: String,
            trim: true,
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
        pushToken: {
            type: String,
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
                    enum: ['Réclamation', 'Questions', 'Autres'],
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
        lastPosition: {
            lat: { type: Number },
            lng: { type: Number }
        },
    },
    {
        timestamps: true,
        collection: 'Clients',
    }
);

const Client: Model<IClient> = mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);

export default Client;
