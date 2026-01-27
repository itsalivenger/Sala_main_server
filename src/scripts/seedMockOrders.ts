/**
 * Script to seed mock orders for testing the Commandes section
 * Run this with: npx ts-node src/scripts/seedMockOrders.ts
 */

import mongoose from 'mongoose';
import Order from '../models/Order';
import Client from '../models/Client';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sala';

const mockOrders = [
    {
        items: [
            {
                name: 'Laptop Dell XPS 15',
                quantity: 1,
                unitWeight: 2.0,
                totalWeight: 2.0,
                price: 8500 // 8500 MAD (DH)
            }
        ],
        totalWeight: 2.0,
        pickupLocation: {
            address: 'Boulevard Zerktouni, Quartier des Hôpitaux, Casablanca',
            lat: 33.5731,
            lng: -7.5898
        },
        dropoffLocation: {
            address: 'Avenue Hassan II, Ain Diab, Casablanca',
            lat: 33.5892,
            lng: -7.6661
        },
        pricing: {
            subtotal: 8500,
            deliveryFee: 50,
            platformMargin: 15,
            livreurNet: 35,
            tax: 0,
            total: 8550,
            discount: 0
        },
        paymentStatus: 'Captured',
        paymentMethod: 'Card'
    },
    {
        items: [
            {
                name: 'iPhone 14 Pro',
                quantity: 1,
                unitWeight: 0.5,
                totalWeight: 0.5,
                price: 12000
            },
            {
                name: 'Coque de protection',
                quantity: 1,
                unitWeight: 0.1,
                totalWeight: 0.1,
                price: 150
            }
        ],
        totalWeight: 0.6,
        pickupLocation: {
            address: 'Twin Center, Boulevard Zerktouni, Casablanca',
            lat: 33.5828,
            lng: -7.6322
        },
        dropoffLocation: {
            address: 'Maarif, Rue Abou Hanifa, Casablanca',
            lat: 33.5780,
            lng: -7.6298
        },
        pricing: {
            subtotal: 12150,
            deliveryFee: 40,
            platformMargin: 12,
            livreurNet: 28,
            tax: 0,
            total: 12190,
            discount: 0
        },
        paymentStatus: 'Captured',
        paymentMethod: 'Card'
    },
    {
        items: [
            {
                name: 'Smart TV Samsung 55"',
                quantity: 1,
                unitWeight: 18.0,
                totalWeight: 18.0,
                price: 6500
            }
        ],
        totalWeight: 18.0,
        pickupLocation: {
            address: 'Morocco Mall, Boulevard de la Corniche, Ain Diab',
            lat: 33.5965,
            lng: -7.6784
        },
        dropoffLocation: {
            address: 'Hay Mohammadi, Rue Ahmed El Bouanani, Casablanca',
            lat: 33.5593,
            lng: -7.5756
        },
        pricing: {
            subtotal: 6500,
            deliveryFee: 80,
            platformMargin: 25,
            livreurNet: 55,
            tax: 0,
            total: 6580,
            discount: 0
        },
        paymentStatus: 'Captured',
        paymentMethod: 'Card'
    },
    {
        items: [
            {
                name: 'Nike Air Max',
                quantity: 2,
                unitWeight: 0.8,
                totalWeight: 1.6,
                price: 1800
            }
        ],
        totalWeight: 1.6,
        pickupLocation: {
            address: 'Anfa Place Living Resort, Boulevard de la Corniche',
            lat: 33.5875,
            lng: -7.6567
        },
        dropoffLocation: {
            address: 'California, Boulevard Bir Anzarane, Casablanca',
            lat: 33.5513,
            lng: -7.6509
        },
        pricing: {
            subtotal: 1800,
            deliveryFee: 45,
            platformMargin: 13,
            livreurNet: 32,
            tax: 0,
            total: 1845,
            discount: 0
        },
        paymentStatus: 'Captured',
        paymentMethod: 'Card'
    },
    {
        items: [
            {
                name: 'Machine à café Nespresso',
                quantity: 1,
                unitWeight: 3.5,
                totalWeight: 3.5,
                price: 2200
            },
            {
                name: 'Capsules café (x100)',
                quantity: 2,
                unitWeight: 0.5,
                totalWeight: 1.0,
                price: 400
            }
        ],
        totalWeight: 4.5,
        pickupLocation: {
            address: 'Centre commercial Tachfine, Route d\'El Jadida',
            lat: 33.5444,
            lng: -7.6731
        },
        dropoffLocation: {
            address: 'Bourgogne, Boulevard Abdelmoumen, Casablanca',
            lat: 33.5698,
            lng: -7.6389
        },
        pricing: {
            subtotal: 3000,
            deliveryFee: 55,
            platformMargin: 18,
            livreurNet: 37,
            tax: 0,
            total: 3055,
            discount: 0
        },
        paymentStatus: 'Captured',
        paymentMethod: 'Card'
    }
];

async function seedMockOrders() {
    try {
        console.log('Connecting to MongoDB...');
        const dbName = process.env.DB_NAME || 'Sala';
        await mongoose.connect(MONGODB_URI, { dbName });
        console.log(`Connected to MongoDB (Database: ${dbName})`);

        // Get or create a client to assign to orders
        let clients = await Client.find().limit(5);

        if (clients.length === 0) {
            console.log('No clients found. Creating a test client...');
            const testClient = await Client.create({
                name: 'Client Test',
                phoneNumber: '0600000000',
                email: 'test@sala.ma',
                city: 'Casablanca',
                address: '123 Rue de Test'
            });
            clients = [testClient];
            console.log('✅ Created test client');
        }

        console.log(`Found ${clients.length} clients`);

        // Delete existing mock orders (optional)
        await Order.deleteMany({
            status: 'PAID',
            livreurId: { $exists: false }
        });
        console.log('Cleared existing available orders');

        // Create mock orders
        for (let i = 0; i < mockOrders.length; i++) {
            const mockOrder = mockOrders[i];
            const randomClient = clients[i % clients.length];

            const order = await Order.create({
                ...mockOrder,
                clientId: randomClient._id,
                status: 'PAID',
                timeline: [
                    {
                        status: 'CREATED',
                        timestamp: new Date(),
                        actor: 'System',
                        note: 'Commande créée'
                    },
                    {
                        status: 'PAID',
                        timestamp: new Date(),
                        actor: 'Client',
                        note: 'Paiement effectué'
                    }
                ],
                adminNotes: [],
                auditLogs: []
            });

            console.log(`✅ Created order #${order._id.toString().slice(-6).toUpperCase()}`);
        }

        console.log(`\n🎉 Successfully created ${mockOrders.length} mock orders!`);
        console.log('These orders are now available in the Commandes section.');

        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding mock orders:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

seedMockOrders();
