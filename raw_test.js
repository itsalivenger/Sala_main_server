const mongoose = require('mongoose');
require('dotenv').config();

const test = async () => {
    try {
        const url = process.env.MONGODB_URI;
        const dbName = process.env.DB_NAME || 'Sala';
        await mongoose.connect(url, { dbName });
        console.log('Connected');

        const livreurColl = mongoose.connection.db.collection('Livreurs');
        const count = await livreurColl.countDocuments();
        console.log('Livreurs count:', count);

        const withComplaints = await livreurColl.find({ complaints: { $exists: true, $not: { $size: 0 } } }).toArray();
        console.log('Livreurs with complaints:', withComplaints.length);

        if (withComplaints.length > 0) {
            console.log('Categories found in complaints:', Array.from(new Set(withComplaints.flatMap(l => l.complaints.map(c => c.category)))));
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
test();
