import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdmin extends Document {
    name: string;
    email: string;
    password?: string;
    role: 'Super Admin' | 'Manager' | 'Support';
    status: 'Active' | 'Inactive';
    lastActive?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const AdminSchema: Schema = new Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide a name'],
            trim: true,
            maxlength: [50, 'Name cannot be more than 50 characters'],
        },
        email: {
            type: String,
            required: [true, 'Please provide an email'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email',
            ],
        },
        password: {
            type: String,
            required: [true, 'Please provide a password'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false,
        },
        role: {
            type: String,
            enum: ['Super Admin', 'Manager', 'Support'],
            default: 'Support',
        },
        status: {
            type: String,
            enum: ['Active', 'Inactive'],
            default: 'Active',
        },
        lastActive: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        collection: 'Admins',
    }
);

const Admin: Model<IAdmin> = mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);

export default Admin;
