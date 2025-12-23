import { Request, Response } from 'express';
import Admin from '../../models/Admin';
import bcrypt from 'bcryptjs';

// Get all admins
export const getAdmins = async (req: Request, res: Response) => {
    try {
        const admins = await Admin.find({}).sort({ createdAt: -1 });

        const formattedAdmins = admins.map(admin => ({
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            status: admin.status,
            lastActive: admin.lastActive ? new Date(admin.lastActive).toLocaleDateString() : 'Jamais'
        }));

        res.json(formattedAdmins);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Create admin
export const createAdmin = async (req: Request, res: Response) => {
    try {
        const { name, email, password, role } = req.body;

        const adminExists = await Admin.findOne({ email });
        if (adminExists) {
            res.status(400).json({ error: 'Cet email est déjà utilisé' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const admin = await Admin.create({
            name,
            email,
            password: hashedPassword,
            role,
            status: 'Active',
            lastActive: new Date()
        });

        res.status(201).json({
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            status: admin.status,
            lastActive: 'À l\'instant'
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Update admin
export const updateAdmin = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, email, role, password } = req.body;

        const admin = await Admin.findById(id);
        if (!admin) {
            res.status(404).json({ error: 'Admin non trouvé' });
            return;
        }

        admin.name = name || admin.name;
        admin.email = email || admin.email;
        admin.role = role || admin.role;

        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            admin.password = await bcrypt.hash(password, salt);
        }

        await admin.save();

        res.json({
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            status: admin.status,
            lastActive: admin.lastActive ? new Date(admin.lastActive).toLocaleDateString() : 'Jamais'
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Delete admin
export const deleteAdmin = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const admin = await Admin.findByIdAndDelete(id);

        if (!admin) {
            res.status(404).json({ error: 'Admin non trouvé' });
            return;
        }

        res.json({ message: 'Admin supprimé avec succès' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
