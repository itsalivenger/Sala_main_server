import mongoose from 'mongoose';

/**
 * Mock order data for testing and fallback when no real orders exist
 * Extracted from seedMockOrders.ts for reusability
 */

export interface MockOrderData {
    items: Array<{
        name: string;
        quantity: number;
        unitWeight: number;
        totalWeight: number;
        price: number;
    }>;
    totalWeight: number;
    pickupLocation: {
        address: string;
        lat: number;
        lng: number;
    };
    dropoffLocation: {
        address: string;
        lat: number;
        lng: number;
    };
    pricing: {
        subtotal: number;
        deliveryFee: number;
        platformMargin: number;
        livreurNet: number;
        tax: number;
        total: number;
        discount: number;
    };
    paymentStatus: string;
    paymentMethod: string;
}

export const mockOrdersData: MockOrderData[] = [
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
            address: 'Hay Mohammadi, Rue Ahmed El Bouanani, Casablanca',
            lat: 33.5593,
            lng: -7.5756
        },
        dropoffLocation: {
            address: 'California, Boulevard Bir Anzarane, Casablanca',
            lat: 33.5513,
            lng: -7.6509
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
            address: 'Bourgogne, Boulevard Abdelmoumen, Casablanca',
            lat: 33.5698,
            lng: -7.6389
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

/**
 * Generate mock orders with proper structure for API responses
 * @param mockClient - Mock client object to populate clientId
 */
export const generateMockOrders = (mockClient?: any) => {
    const client = mockClient || {
        _id: new mongoose.Types.ObjectId(),
        name: 'Client Test',
        phoneNumber: '0612345678',
        city: 'Casablanca'
    };

    return mockOrdersData.map((mockData, index) => ({
        _id: new mongoose.Types.ObjectId(),
        ...mockData,
        clientId: client,
        status: 'PAID',
        timeline: [
            {
                status: 'CREATED',
                timestamp: new Date(Date.now() - (5 - index) * 60000), // Stagger by minutes
                actor: 'System',
                note: 'Commande créée'
            },
            {
                status: 'PAID',
                timestamp: new Date(Date.now() - (5 - index) * 60000 + 30000),
                actor: 'Client',
                note: 'Paiement effectué'
            }
        ],
        adminNotes: [],
        auditLogs: [],
        createdAt: new Date(Date.now() - (5 - index) * 60000),
        updatedAt: new Date(Date.now() - (5 - index) * 60000)
    }));
};
