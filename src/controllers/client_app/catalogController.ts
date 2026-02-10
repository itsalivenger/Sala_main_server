import { Request, Response } from 'express';
import Product from '../../models/Product';
import Category from '../../models/Category';

/**
 * GET /api/client/catalog/products
 * Fetch products with search and category filtering
 */
export const getProducts = async (req: Request, res: Response) => {
    try {
        const { search, category, page = 1, limit = 20 } = req.query;
        const query: any = { isAvailable: true };

        if (category) {
            // Find category by name or slug to be more robust
            const cat = await Category.findOne({
                $or: [{ name: category }, { slug: category }],
                isActive: true
            });
            if (cat) {
                query.category = cat.name;
            } else {
                // Fallback for legacy data/direct matching
                query.category = category;
            }
        }

        if (search) {
            query.$text = { $search: search as string };
        }

        const skip = (Number(page) - 1) * Number(limit);
        const products = await Product.find(query)
            .skip(skip)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        const total = await Product.countDocuments(query);

        res.json({
            success: true,
            products,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        });
    } catch (error) {
        console.error('[CatalogController] Error fetching products:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des produits' });
    }
};

/**
 * GET /api/client/catalog/products/:id
 */
export const getProductDetails = async (req: Request, res: Response) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Produit non trouvé' });
        }
        res.json({ success: true, product });
    } catch (error) {
        console.error('[CatalogController] Error fetching product details:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération du produit' });
    }
};

/**
 * GET /api/client/catalog/categories
 */
export const getCategories = async (_req: Request, res: Response) => {
    try {
        const categories = await Category.find({ isActive: true }).sort({ name: 1 });
        res.json({ success: true, categories });
    } catch (error) {
        console.error('[CatalogController] Error fetching categories:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des catégories' });
    }
};
