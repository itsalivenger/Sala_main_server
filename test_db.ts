import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import Client from './src/models/Client';
import Livreur from './src/models/Livreur';

dotenv.config();

const testDb = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        const dbName = process.env.DB_NAME || 'Sala';

        if (!MONGODB_URI) {
            console.log('MONGODB_URI not found in .env');
            return;
        }

        console.log('Connecting to:', MONGODB_URI);
        await mongoose.connect(MONGODB_URI, { dbName: dbName });
        console.log(`Connected to database: ${dbName}`);

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections in DB:', collections.map(c => c.name));

        const clientCount = await Client.countDocuments();
        const livreurCount = await Livreur.countDocuments();
        console.log(`Documents count using Client model (coll: Clients): ${clientCount}`);
        console.log(`Documents count using Livreur model (coll: Livreurs): ${livreurCount}`);

        const livreurDocs = await Livreur.find({ 'complaints.0': { $exists: true } }).limit(1);
        if (livreurDocs.length > 0) {
            console.log('Found Livreur with complaints. Category of first complaint:', livreurDocs[0].complaints[0].category);
        } else {
            console.log('No Livreurs with complaints found using model.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Test Error:', err);
        process.exit(1);
    }
};

testDb();
