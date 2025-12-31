import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.admin_token) {
        token = req.cookies.admin_token;
    }

    if (!token) {
        console.warn('[AUTH_MIDDLEWARE] No token found in Authorization header or cookies');
        res.status(401).json({ success: false, message: 'Not authorized to access this route' });
        return;
    }

    try {
        const secret = process.env.JWT_SECRET || 'secret';
        const decoded = jwt.verify(token, secret) as any;
        (req as any).user = decoded;
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
