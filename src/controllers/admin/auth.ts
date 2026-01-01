import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../../models/Admin';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-me';

// Login
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ email }).select('+password');
        if (!admin || !admin.password) {
            res.status(401).json({ error: 'Email ou mot de passe incorrect' });
            return;
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            res.status(401).json({ error: 'Email ou mot de passe incorrect' });
            return;
        }

        admin.lastActive = new Date();
        await admin.save();

        const token = jwt.sign(
            { id: admin._id, email: admin.email, role: admin.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set HttpOnly Cookie
        res.cookie('admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            path: '/'
        });

        res.json({
            message: 'Connexion réussie',
            token,
            user: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Logout
export const logout = async (req: Request, res: Response) => {
    res.clearCookie('admin_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    });
    res.json({ message: 'Déconnexion réussie' });
};
