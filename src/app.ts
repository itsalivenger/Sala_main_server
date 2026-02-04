import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';

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
import orderRoutes from './routes/admin/orders';
import uploadRoutes from './routes/admin/upload';
import cmsRoutes from './routes/admin/cms';
import dashboardRoutes from './routes/admin/dashboard';
import faqRoutes from './routes/admin/faq';
import enquiryRoutes from './routes/enquiry';

// Client App Routes
import clientAuthRoutes from './routes/client_app/auth';
import supportRoutes from './routes/client_app/supportRoutes';
import catalogRoutes from './routes/client_app/catalog';
import clientOrderRoutes from './routes/client_app/orders';
import clientSettingsRoutes from './routes/client_app/settings';
import clientMessageRoutes from './routes/client_app/messages';
import clientNotificationRoutes from './routes/client_app/notifications';

// Livreur App Routes
import livreurAuthRoutes from './routes/livreur/auth';
import livreurWalletRoutes from './routes/livreur/wallet';
import livreurOrdersRoutes from './routes/livreur/orders';
import livreurAvailabilityRoutes from './routes/livreur/availability';
import livreurPerformanceRoutes from './routes/livreur/performance';
import livreurUploadRoutes from './routes/livreur/upload';

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001'
];
if (process.env.ALLOWED_ORIGINS) {
    allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()));
}

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        if (allowedOrigins.some(allowed => origin === allowed || (allowed.endsWith('/') && origin === allowed.slice(0, -1)))) {
            callback(null, true);
        } else {
            console.warn(`[SALA_CORS] Blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(morgan('dev'));

// --- PRIORITY ROUTES (Livreur) ---
app.use('/api/livreur/orders', livreurOrdersRoutes);
app.use('/api/livreur/auth', livreurAuthRoutes);
app.use('/api/livreur/wallet', livreurWalletRoutes);
app.use('/api/livreur/availability', livreurAvailabilityRoutes);
app.use('/api/livreur/performance', livreurPerformanceRoutes);
app.use('/api/livreur/upload', livreurUploadRoutes);

// --- ADMIN ROUTES ---
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
app.use('/api/admin/orders', orderRoutes);
app.use('/api/admin/upload', uploadRoutes);
app.use('/api/admin/cms', cmsRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/faq', faqRoutes);
app.use('/api/enquiries', enquiryRoutes);

// --- CLIENT ROUTES ---
app.use('/api/client/auth', clientAuthRoutes);
app.use('/api/client/support', supportRoutes);
app.use('/api/client/catalog', catalogRoutes);
app.use('/api/client/orders', clientOrderRoutes);
app.use('/api/client/orders', clientMessageRoutes); // Message routes nested under orders
app.use('/api/client/settings', clientSettingsRoutes);
app.use('/api/client/notifications', clientNotificationRoutes);

// --- STATIC ASSETS ---
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// --- HEALTH CHECK ---
app.get('/', (req: Request, res: Response) => {
    res.json({
        message: 'SALA Main Server - Operations Layer',
        status: 'active'
    });
});

app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK' });
});

// --- 404 HANDLER ---
app.use((req: Request, res: Response) => {
    console.warn(`[SALA_404] Route not found: ${req.method} ${req.url}`);
    res.status(404).send(`SALA_NOT_FOUND: ${req.method} ${req.url}`);
});

// --- ERROR HANDLER ---
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[SALA_ERROR] Full error:', err);
    console.error('[SALA_ERROR] Stack:', err?.stack);
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: err.message || 'An unexpected error occurred',
        details: typeof err === 'string' ? err : undefined
    });
});

export default app;
