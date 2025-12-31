import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';


// Route Imports
import newsletterRoutes from './routes/admin/newsletter';
import adminAccountsRoutes from './routes/admin/admins';
import adminComplaintsRoutes from './routes/admin/complaints';
import adminClientsRoutes from './routes/admin/clients';
import adminLivreursRoutes from './routes/admin/livreurs';
import authRoutes from './routes/admin/auth';
import settingsRoutes from './routes/admin/settings';

// Client App Routes
import clientAuthRoutes from './routes/client_app/auth';
import supportRoutes from './routes/client_app/supportRoutes';

// Livreur App Routes
import livreurAuthRoutes from './routes/livreur/auth';

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('dev'));

// Scoped Admin Routes (moved to main_server)
app.use('/api/admin/newsletter', newsletterRoutes);
app.use('/api/admin/admins', adminAccountsRoutes);
app.use('/api/admin/complaints', adminComplaintsRoutes);
app.use('/api/admin/clients', adminClientsRoutes);
app.use('/api/admin/livreurs', adminLivreursRoutes);
app.use('/api/admin/auth', authRoutes);
app.use('/api/admin/settings', settingsRoutes);
import orderRoutes from './routes/admin/orders';
app.use('/api/admin/orders', orderRoutes);
import uploadRoutes from './routes/admin/upload';
app.use('/api/admin/upload', uploadRoutes);
import cmsRoutes from './routes/admin/cms';
app.use('/api/admin/cms', cmsRoutes);
import dashboardRoutes from './routes/admin/dashboard';
app.use('/api/admin/dashboard', dashboardRoutes);

// Static files for uploads
import path from 'path';
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Client App Routes
app.use('/api/client/auth', clientAuthRoutes);
app.use('/api/client/support', supportRoutes);

// Livreur App Routes
app.use('/api/livreur/auth', livreurAuthRoutes);

// Basic Route for Health Check
app.get('/', (req: Request, res: Response) => {
    res.json({
        message: 'SALA Main Server - Operations Layer',
        status: 'active'
    });
});

app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK' });
});

// Error Handling Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
