import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/Order';
import Livreur from '../models/Livreur';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';

const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

async function verifyLogic() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Clean up
        await Livreur.deleteMany({ phoneNumber: { $regex: /^TEST_/ } });
        console.log('Cleaned up test livreurs');

        // 2. Create 10 mock livreurs at various distances from a central point (0, 0)
        const centralLat = 33.5731; // Casablanca
        const centralLng = -7.5898;

        const livreurPromises = [];
        for (let i = 1; i <= 10; i++) {
            // Offset drivers by i * 0.01 degrees (~1.1km each)
            livreurPromises.push(new Livreur({
                phoneNumber: `TEST_DRIVER_${i}`,
                name: `Test Driver ${i}`,
                status: 'Approved',
                isOnline: true,
                lastLocation: {
                    lat: centralLat + (i * 0.01),
                    lng: centralLng + (i * 0.01),
                    timestamp: new Date()
                },
                vehicle: { type: 'moto', model: 'Test', plateNumber: `TEST-${i}` }
            }).save());
        }

        const drivers = await Promise.all(livreurPromises);
        console.log(`Created ${drivers.length} test drivers`);

        // 3. Find the expected top 5 (which should be TEST_DRIVER_1 to 5)
        const expectedIds = drivers
            .slice(0, 5)
            .map(d => d._id.toString())
            .sort();

        console.log('Expected top 5 driver IDs:', expectedIds);

        // 4. Manual check using the same logic as orderController
        const onlineLivreurs = await Livreur.find({
            isOnline: true,
            status: 'Approved',
            'lastLocation.lat': { $exists: true },
            'lastLocation.lng': { $exists: true }
        }).select('_id lastLocation');

        const driversWithDistance = onlineLivreurs.map(driver => ({
            id: driver._id,
            distance: getDistanceKm(
                centralLat,
                centralLng,
                driver.lastLocation!.lat,
                driver.lastLocation!.lng
            )
        }));

        const eligibleDrivers = driversWithDistance
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5);

        const actualIds = eligibleDrivers.map(d => d.id.toString()).sort();
        console.log('Actual top 5 driver IDs:', actualIds);

        // 5. Assertion
        const isMatch = JSON.stringify(expectedIds) === JSON.stringify(actualIds);
        if (isMatch) {
            console.log(' SUCCESS: The logic correctly identified the top 5 nearest drivers.');
        } else {
            console.error(' FAILURE: The logic did NOT identify the correct top 5 drivers.');
        }

        // Clean up
        await Livreur.deleteMany({ phoneNumber: { $regex: /^TEST_/ } });
        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verifyLogic();
