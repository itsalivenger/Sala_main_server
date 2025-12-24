import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
    phoneNumber: string;
    name?: string;
    city?: string;
    role: 'user' | 'livreur' | 'admin';
    otp?: string;
    otpExpires?: Date;
    isVerified: boolean;
    status: 'Active' | 'Inactive' | 'Pending';
    notifications: Array<{
        title: string;
        message: string;
        type: 'Order' | 'Finance' | 'Compliance' | 'General';
        isRead: boolean;
        createdAt: Date;
    }>;
    complaints: Array<{
        subject: string;
        status: 'Open' | 'Resolved' | 'In Progress';
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

const UserSchema: Schema = new Schema(
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
        role: {
            type: String,
            enum: ['user', 'livreur', 'admin'],
            default: 'user',
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
            enum: ['Active', 'Inactive', 'Pending'],
            default: 'Pending',
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
                status: { type: String, enum: ['Open', 'Resolved', 'In Progress'], default: 'Open' },
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
        collection: 'Users',
    }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
