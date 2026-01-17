import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import app from './app';

import { Server } from 'socket.io';
import http from 'http';

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('FATAL ERROR: MONGODB_URI is not defined in .env');
    process.exit(1);
}

const startServer = async () => {
    try {
        const dbName = process.env.DB_NAME || 'Sala';
        // Connecting to MongoDB
        await mongoose.connect(MONGODB_URI, {
            dbName: dbName
        });
        console.log(`✅ Connected to MongoDB (Database: ${dbName})`);

        const server = http.createServer(app);
        const io = new Server(server, {
            cors: {
                origin: "*", // Adjust for production
                methods: ["GET", "POST"]
            }
        });

        // Socket.io Tracking
        const orderViewers: Record<string, number> = {};

        io.on('connection', (socket: any) => {
            console.log(`[Socket] New connection: ${socket.id}`);

            socket.on('join_order', (orderId: string) => {
                socket.join(`order:${orderId}`);
                orderViewers[orderId] = (orderViewers[orderId] || 0) + 1;
                console.log(`[Socket] User ${socket.id} joined order:${orderId}. Total viewers: ${orderViewers[orderId]}`);
                io.to(`order:${orderId}`).emit('viewers_count_updated', orderViewers[orderId]);
            });

            socket.on('leave_order', (orderId: string) => {
                socket.leave(`order:${orderId}`);
                if (orderViewers[orderId]) {
                    orderViewers[orderId]--;
                    io.to(`order:${orderId}`).emit('viewers_count_updated', orderViewers[orderId]);
                }
            });

            socket.on('disconnect', () => {
                // Cleanup would require tracking which rooms a socket is in
                console.log(`[Socket] Disconnected: ${socket.id}`);
            });
        });

        server.listen(Number(PORT), '0.0.0.0', () => {
            console.log(`🚀 main_server running on port ${PORT} with Socket.io`);
        });

    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        process.exit(1);
    }
};

startServer();
