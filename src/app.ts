import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';


// Route Imports
import newsletterRoutes from './routes/admin/newsletter';
import adminAccountsRoutes from './routes/admin/admins';
import authRoutes from './routes/admin/auth';

// Client App Routes
import clientAuthRoutes from './routes/client_app/auth';
import supportRoutes from './routes/client_app/supportRoutes';

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Scoped Admin Routes (moved to main_server)
app.use('/api/admin/newsletter', newsletterRoutes);
app.use('/api/admin/admins', adminAccountsRoutes);
app.use('/api/admin/auth', authRoutes);

// Client App Routes
app.use('/api/client/auth', clientAuthRoutes);
app.use('/api/client/support', supportRoutes);

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
