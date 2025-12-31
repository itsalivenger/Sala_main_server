import { Request, Response } from 'express';
import Order from '../../models/Order';
import Client from '../../models/Client';
import Livreur from '../../models/Livreur';
import mongoose from 'mongoose';

export const seedOrders = async (req: Request, res: Response) => {
    try {
        // Check and Create Clients if needed
        let clients = await Client.find().limit(5);
        if (clients.length === 0) {
            console.log('No clients found, creating mock clients...');
            const mockClients = Array.from({ length: 5 }).map((_, i) => ({
                name: `Client Demo ${i + 1}`,
                phoneNumber: `060000000${i}`,
                password: 'password123',
                status: 'Active',
                city: 'Casablanca'
            }));
            await Client.insertMany(mockClients);
            clients = await Client.find().limit(5);
        }

        // Check and Create Livreurs if needed
        let livreurs = await Livreur.find().limit(5);
        if (livreurs.length === 0) {
            console.log('No livreurs found, creating mock livreurs...');
            const mockLivreurs = Array.from({ length: 3 }).map((_, i) => ({
                name: `Livreur Test ${i + 1}`,
                phoneNumber: `070000000${i}`,
                password: 'password123',
                status: 'Active',
                vehicle: { type: 'Moto' },
                city: 'Casablanca'
            }));
            await Livreur.insertMany(mockLivreurs);
            livreurs = await Livreur.find().limit(5);
        }

        const statuses = ['CREATED', 'PAID', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED_CLIENT', 'CANCELLED_ADMIN', 'REFUNDED'];

        const orders = [];

        for (let i = 0; i < 10; i++) {
            const client = clients[Math.floor(Math.random() * clients.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const livreur = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(status) && livreurs.length > 0
                ? livreurs[Math.floor(Math.random() * livreurs.length)]
                : null;

            const subtotal = Math.floor(Math.random() * 500) + 50;
            const deliveryFee = 20;
            const total = subtotal + deliveryFee;

            orders.push({
                clientId: client._id,
                livreurId: livreur?._id,
                status,
                items: [
                    {
                        name: 'Produit Test ' + (i + 1),
                        quantity: Math.floor(Math.random() * 3) + 1,
                        unitWeight: 1,
                        totalWeight: Math.floor(Math.random() * 3) + 1,
                        price: subtotal
                    }
                ],
                totalWeight: Math.floor(Math.random() * 5) + 1,
                pickupLocation: {
                    address: 'Casablanca, Morocco',
                    lat: 33.5731,
                    lng: -7.5898
                },
                dropoffLocation: {
                    address: (client as any).city || 'Rabat, Morocco',
                    lat: 34.0209,
                    lng: -6.8416
                },
                pricing: {
                    subtotal,
                    deliveryFee,
                    platformMargin: 5,
                    livreurNet: deliveryFee - 5,
                    tax: 0,
                    total: total,
                    discount: 0
                },
                paymentStatus: status === 'CREATED' ? 'Pending' : 'Captured',
                paymentMethod: 'Cash',
                timeline: [
                    { status: 'CREATED', timestamp: new Date(), actor: 'System' }
                ],
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        await Order.insertMany(orders);

        res.json({ success: true, message: '10 Mock Orders Created (with Clients/Livreurs if needed)' });
    } catch (error: any) {
        console.error('Seed Error:', error);
        res.status(500).json({ error: error.message });
    }
};
