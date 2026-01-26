import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Client from '../models/Client';
import Livreur from '../models/Livreur';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.admin_token) {
        token = req.cookies.admin_token;
    }

    if (!token) {
        console.warn(`[AUTH_MIDDLEWARE] No token found. Headers: ${JSON.stringify(req.headers.authorization ? 'Present' : 'Missing')}`);
        res.status(401).json({ success: false, message: 'Not authorized to access this route' });
        return;
    }

    try {
        const secret = process.env.JWT_SECRET || 'secret';
        const decoded = jwt.verify(token, secret) as any;
        (req as any).user = decoded;

        // Check for account suspension if Client or Livreur
        if (decoded.role === 'user') {
            const client = await Client.findById(decoded.id).select('status');
            if (client && client.status === 'Suspended') {
                res.status(403).json({ success: false, message: 'Votre compte a été suspendu. Veuillez contacter le support.' });
                return;
            }
        } else if (decoded.role === 'livreur') {
            const livreur = await Livreur.findById(decoded.id).select('status');
            if (livreur && livreur.status === 'Suspended') {
                res.status(403).json({ success: false, message: 'Votre compte a été suspendu. Veuillez contacter le support.' });
                return;
            }
        }

        next();
    } catch (err: any) {
        console.error('[AUTH_MIDDLEWARE] Token verification failed:', err.message);
        res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }
};

// Grant access to specific roles
export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!(req as any).user || !roles.includes((req as any).user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${(req as any).user?.role} is not authorized to access this route`
            });
        }
        next();
    };
};
