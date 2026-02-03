
import path from 'path';
import fs from 'fs';

// 1. Check Font
const fontPath = path.join(__dirname, 'public', 'NotoSansArabic-Regular.ttf');
console.log('--- Font Check ---');
console.log('Path:', fontPath);
console.log('Exists:', fs.existsSync(fontPath));

// 2. Check Library Import
console.log('\n--- Library Check ---');
try {
    const rawImport = require('arabic-persian-reshaper');
    console.log('Type of import:', typeof rawImport);
    console.log('Keys:', Object.keys(rawImport));

    if (typeof rawImport === 'function') {
        console.log('Import is a function (Constructor?)');
        try {
            // Try as class
            const instance = new rawImport();
            console.log('Instantiated successfully via new Import()');
            console.log('Reshape method exists on instance?', typeof instance.reshape);
            if (instance.reshape) {
                console.log('Test "Salam":', instance.reshape('سلام'));
            }
        } catch (e: any) {
            console.log('Failed to instantiate with new:', e.message);
        }
    }

    if (rawImport.ArabicReshaper) {
        console.log('Import has .ArabicReshaper property');
        try {
            const instance = new rawImport.ArabicReshaper();
            console.log('Instantiated successfully via new Import.ArabicReshaper()');
            console.log('Test "Salam":', instance.reshape('سلام'));
        } catch (e: any) {
            console.log('Failed to instantiate .ArabicReshaper with new:', e.message);
        }
    }
} catch (e: any) {
    console.error('Failed to require library:', e.message);
}
