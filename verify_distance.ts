
import mongoose from 'mongoose';
import Order from './src/models/Order';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const verifyDistance = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sala_app';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const orders = await Order.find({ status: { $in: ['DELIVERED', 'COMPLETED'] } })
            .sort({ createdAt: -1 })
            .limit(10)
            .select('distance status createdAt pricing');

        console.log('Last 10 Delivered/Completed Orders:');
        orders.forEach(order => {
            console.log(`Order ID: ${order._id}`);
            console.log(`  Status: ${order.status}`);
            console.log(`  Created: ${order.createdAt}`);
            console.log(`  Distance: ${order.distance}`);
            console.log(`  Delivery Fee: ${order.pricing?.deliveryFee}`);
            console.log('-------------------------');
        });

        const countWithDistance = await Order.countDocuments({
            status: { $in: ['DELIVERED', 'COMPLETED'] },
            distance: { $exists: true, $gt: 0 }
        });

        const countTotal = await Order.countDocuments({
            status: { $in: ['DELIVERED', 'COMPLETED'] }
        });

        console.log(`Summary: ${countWithDistance} out of ${countTotal} delivered/completed orders have distance > 0.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

verifyDistance();
