import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Admin from '../models/Admin';
import connectDB from '../config/db';

dotenv.config();

/**
 * USAGE:
 * npx ts-node src/scripts/resetAdmin.ts <email> <new_password>
 */

const resetAdmin = async () => {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
        console.error('❌ Usage: npx ts-node src/scripts/resetAdmin.ts <email> <new_password>');
        process.exit(1);
    }

    try {
        await connectDB();
        console.log('📡 Connected to Database...');

        const admin = await Admin.findOne({ email });

        if (!admin) {
            console.log(`🔍 Admin not found. Creating new admin: ${email}...`);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            await Admin.create({
                name: 'Main Admin',
                email,
                password: hashedPassword,
                role: 'Super Admin',
                status: 'Active'
            });
            console.log('✅ Admin created successfully!');
        } else {
            console.log(`🔍 Admin found. Updating password for: ${email}...`);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            admin.password = hashedPassword;
            await admin.save();
            console.log('✅ Password updated successfully!');
        }

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

resetAdmin();
