import { Request, Response } from 'express';
import Product from '../../models/Product';
import Category from '../../models/Category';
import AuditLog from '../../models/AuditLog';

export const getCatalogProducts = async (req: Request, res: Response) => {
    try {
        const { search, category, status, page = 1, limit = 10 } = req.query;
        const query: any = {};

        if (category) query.category = category;
        if (status === 'active') query.isActive = true;
        if (status === 'inactive') query.isActive = false;

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const products = await Product.find(query)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Product.countDocuments(query);

        res.json({
            success: true,
            products,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('[CatalogController] Error fetching catalog products:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const createProduct = async (req: any, res: Response) => {
    try {
        const { name, description, category, unitWeight, weightClass, dimensions, images, tags, isActive } = req.body;

        const product = new Product({
            name,
            description,
            category,
            unitWeight,
            weightClass,
            dimensions,
            images,
            tags,
            isActive: isActive !== undefined ? isActive : true,
            price: 0,
            stockQuantity: 0,
        });

        await product.save();

        // Audit Log
        await AuditLog.create({
            action: 'CREATE_PRODUCT',
            module: 'CATALOG',
            details: `Created product: ${name} (${category})`,
            performedBy: req.user?.id || req.body.adminId,
            performedByName: req.user?.name || req.user?.email || 'Admin',
            entityId: product._id
        });

        res.json({ success: true, product });
    } catch (error) {
        console.error('[CatalogController] Error creating product:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const updateProduct = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Forbid pricing/inventory updates via this flow
        delete updates.price;
        delete updates.stockQuantity;

        const product = await Product.findByIdAndUpdate(id, updates, { new: true });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Audit Log
        await AuditLog.create({
            action: 'UPDATE_PRODUCT',
            module: 'CATALOG',
            details: `Updated product: ${product.name}`,
            performedBy: req.user?.id || req.body.adminId,
            performedByName: req.user?.name || req.user?.email || 'Admin',
            entityId: product._id
        });

        res.json({ success: true, product });
    } catch (error) {
        console.error('[CatalogController] Error updating product:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const deleteProduct = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const product = await Product.findByIdAndDelete(id);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Audit Log
        await AuditLog.create({
            action: 'DEACTIVATE_PRODUCT',
            module: 'CATALOG',
            details: `Deactivated product: ${product.name}`,
            performedBy: req.user?.id || req.body.adminId,
            performedByName: req.user?.name || req.user?.email || 'Admin',
            entityId: product._id
        });

        res.json({ success: true, message: 'Product deactivated successfully' });
    } catch (error) {
        console.error('[CatalogController] Error deactivating product:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getProductById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, product });
    } catch (error) {
        console.error('[CatalogController] Error fetching product by ID:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getCategories = async (req: Request, res: Response) => {
    try {
        const categories = await Product.distinct('category');
        res.json({ success: true, categories });
    } catch (error) {
        console.error('[CatalogController] Error fetching categories:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
export const bulkDeleteProducts = async (req: any, res: Response) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'No product IDs provided' });
        }

        const result = await Product.deleteMany({ _id: { $in: ids } });

        // Audit Log
        await AuditLog.create({
            action: 'BULK_DELETE_PRODUCTS',
            module: 'CATALOG',
            details: `Bulk deleted ${result.deletedCount} products`,
            performedBy: req.user?.id || req.body.adminId,
            performedByName: req.user?.name || req.user?.email || 'Admin'
        });

        res.json({ success: true, message: `${result.deletedCount} products deleted successfully` });
    } catch (error) {
        console.error('[CatalogController] Error bulk deleting products:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const bulkUpdateProducts = async (req: any, res: Response) => {
    try {
        const { ids, updates } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'No product IDs provided' });
        }

        // Forbid pricing/inventory updates via bulk flow for safety
        delete updates.price;
        delete updates.stockQuantity;

        const result = await Product.updateMany({ _id: { $in: ids } }, { $set: updates });

        // Audit Log
        await AuditLog.create({
            action: 'BULK_UPDATE_PRODUCTS',
            module: 'CATALOG',
            details: `Bulk updated ${result.modifiedCount} products`,
            performedBy: req.user?.id || req.body.adminId,
            performedByName: req.user?.name || req.user?.email || 'Admin'
        });

        res.json({ success: true, message: `${result.modifiedCount} products updated successfully` });
    } catch (error) {
        console.error('[CatalogController] Error bulk updating products:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
