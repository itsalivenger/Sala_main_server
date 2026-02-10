import { Request, Response } from 'express';
import Product from '../../models/Product';

export const seedProducts = async (_req: Request, res: Response) => {
    try {
        // Clear existing products
        await Product.deleteMany({});

        const products = [
            {
                name: 'Pack Épicerie Essentiel',
                description: 'Un assortiment de produits de base : Farine, Huile, Sucre et Thé.',
                price: 120,
                unitWeight: 5,
                category: 'Courses',
                tags: ['urgent', 'essentiel', 'cuisine'],
                stockQuantity: 50,
            },
            {
                name: 'Coffret Parapharmacie',
                description: 'Produits de soin et d\'hygiène essentiels.',
                price: 250,
                unitWeight: 1.5,
                category: 'Pharmacie',
                tags: ['santé', 'soin'],
                stockQuantity: 20,
            },
            {
                name: 'Chargeur Universel Rapide',
                description: 'Compatible avec tous les smartphones modernes.',
                price: 85,
                unitWeight: 0.2,
                category: 'Électronique',
                tags: ['accessoire', 'tech'],
                stockQuantity: 100,
            },
            {
                name: 'Kit Fournitures Scolaires',
                description: 'Cahiers, stylos et accessoires pour la rentrée.',
                price: 150,
                unitWeight: 2,
                category: 'Papeterie',
                tags: ['école', 'bureau'],
                stockQuantity: 30,
            }
        ];

        await Product.insertMany(products);
        res.json({ success: true, message: 'Produits ajoutés avec succès' });
    } catch (error) {
        console.error('Seed Products Error:', error);
        res.status(500).json({ error: 'Échec du peuplement des produits' });
    }
};
