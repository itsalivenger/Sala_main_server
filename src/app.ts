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
import adminWalletRoutes from './routes/admin/wallet';
import settingsRoutes from './routes/admin/settings';
import adminCatalogRoutes from './routes/admin/catalog';
import adminCategoryRoutes from './routes/admin/categories';

// Client App Routes
import clientAuthRoutes from './routes/client_app/auth';
import supportRoutes from './routes/client_app/supportRoutes';
import catalogRoutes from './routes/client_app/catalog';
import clientOrderRoutes from './routes/client_app/orders';

// Livreur App Routes
import livreurAuthRoutes from './routes/livreur/auth';
import livreurWalletRoutes from './routes/livreur/wallet';
import livreurOrdersRoutes from './routes/livreur/orders';
import livreurAvailabilityRoutes from './routes/livreur/availability';

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const allowedOrigins = ['http://localhost:3000'];
if (process.env.ALLOWED_ORIGINS) {
    allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()));
}

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked for origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
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
app.use('/api/admin/wallet', adminWalletRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/admin/catalog', adminCatalogRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
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
app.use('/api/client/catalog', catalogRoutes);
app.use('/api/client/orders', clientOrderRoutes);

// Livreur App Routes
app.use('/api/livreur/auth', livreurAuthRoutes);
app.use('/api/livreur/wallet', livreurWalletRoutes);
app.use('/api/livreur/orders', livreurOrdersRoutes);
app.use('/api/livreur/availability', livreurAvailabilityRoutes);

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
