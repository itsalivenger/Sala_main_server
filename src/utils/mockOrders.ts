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
                price: 8500_00 // 8500 MAD in cents
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
            subtotal: 8500_00,
            deliveryFee: 50_00,
            platformMargin: 15_00,
            livreurNet: 35_00,
            tax: 0,
            total: 8550_00,
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
                price: 12000_00
            },
            {
                name: 'Coque de protection',
                quantity: 1,
                unitWeight: 0.1,
                totalWeight: 0.1,
                price: 150_00
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
            subtotal: 12150_00,
            deliveryFee: 40_00,
            platformMargin: 12_00,
            livreurNet: 28_00,
            tax: 0,
            total: 12190_00,
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
                price: 6500_00
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
            subtotal: 6500_00,
            deliveryFee: 80_00,
            platformMargin: 25_00,
            livreurNet: 55_00,
            tax: 0,
            total: 6580_00,
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
                price: 1800_00
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
            subtotal: 1800_00,
            deliveryFee: 45_00,
            platformMargin: 13_00,
            livreurNet: 32_00,
            tax: 0,
            total: 1845_00,
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
                price: 2200_00
            },
            {
                name: 'Capsules café (x100)',
                quantity: 2,
                unitWeight: 0.5,
                totalWeight: 1.0,
                price: 400_00
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
            subtotal: 3000_00,
            deliveryFee: 55_00,
            platformMargin: 18_00,
            livreurNet: 37_00,
            tax: 0,
            total: 3055_00,
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
