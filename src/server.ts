import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import app from './app';

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('FATAL ERROR: MONGODB_URI is not defined in .env');
    process.exit(1);
}

const startServer = async () => {
    try {
        const dbName = process.env.DB_NAME || 'Sala';
        await mongoose.connect(MONGODB_URI, {
            dbName: dbName
        });
        console.log(`✅ Connected to MongoDB (Database: ${dbName})`);

        app.listen(Number(PORT), '0.0.0.0', () => {
            console.log(`🚀 main_server running on port ${PORT} (accessible at http://${process.env.LOCAL_IP || '0.0.0.0'}:${PORT})`);
        });

    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        process.exit(1);
    }
};

startServer();
