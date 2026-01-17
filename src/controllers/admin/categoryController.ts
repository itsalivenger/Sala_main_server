import { Request, Response } from 'express';
import Category from '../../models/Category';
import Product from '../../models/Product';
import AuditLog from '../../models/AuditLog';
import PlatformSettings from '../../models/PlatformSettings';

export const getCategories = async (req: Request, res: Response) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json({ success: true, categories });
    } catch (error) {
        console.error('[CategoryController] Error fetching categories:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const createCategory = async (req: any, res: Response) => {
    try {
        const { name, description, icon, isActive } = req.body;

        const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Category already exists' });
        }

        // Check platform limits (Active categories only)
        const isActuallyActive = isActive !== undefined ? isActive : true;
        if (isActuallyActive) {
            const settings = await PlatformSettings.findOne();
            if (settings && settings.max_categories) {
                const activeCount = await Category.countDocuments({ isActive: true });
                if (activeCount >= settings.max_categories) {
                    return res.status(400).json({
                        success: false,
                        message: `Daily/Active category limit reached (${settings.max_categories}). Please deactivate an existing category or increase the limit in platform settings.`
                    });
                }
            }
        }

        const category = new Category({
            name,
            description,
            icon,
            isActive: isActive !== undefined ? isActive : true
        });

        await category.save();

        // Audit Log
        if (req.user) {
            await AuditLog.create({
                action: 'CREATE',
                module: 'CATALOG',
                details: `Created category: ${name}`,
                performedBy: req.user.id,
                performedByName: req.user.name || req.user.email || 'Admin',
                entityId: category._id
            });
        }

        res.status(201).json({ success: true, category });
    } catch (error) {
        console.error('[CategoryController] Error creating category:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const updateCategory = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, icon, isActive } = req.body;

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        const oldName = category.name;

        // Check platform limits if activating
        if (isActive === true && category.isActive !== true) {
            const settings = await PlatformSettings.findOne();
            if (settings && settings.max_categories) {
                const activeCount = await Category.countDocuments({ isActive: true });
                if (activeCount >= settings.max_categories) {
                    return res.status(400).json({
                        success: false,
                        message: `Active category limit reached (${settings.max_categories}). Please deactivate another category first.`
                    });
                }
            }
        }

        category.name = name || category.name;
        category.description = description !== undefined ? description : category.description;
        category.icon = icon !== undefined ? icon : category.icon;
        category.isActive = isActive !== undefined ? isActive : category.isActive;

        await category.save();

        // If name changed, update all products belonging to this category
        if (name && name !== oldName) {
            await Product.updateMany({ category: oldName }, { category: name });
        }

        // Audit Log
        if (req.user) {
            await AuditLog.create({
                action: 'UPDATE',
                module: 'CATALOG',
                details: `Updated category: ${oldName} -> ${category.name}`,
                performedBy: req.user.id,
                performedByName: req.user.name || req.user.email || 'Admin',
                entityId: category._id
            });
        }

        res.json({ success: true, category });
    } catch (error) {
        console.error('[CategoryController] Error updating category:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const deleteCategory = async (req: any, res: Response) => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // Check if any products are using this category
        const productCount = await Product.countDocuments({ category: category.name });
        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category: ${productCount} products are still assigned to it. Please reassign them first.`
            });
        }

        await category.deleteOne();

        // Audit Log
        if (req.user) {
            await AuditLog.create({
                action: 'DELETE',
                module: 'CATALOG',
                details: `Deleted category: ${category.name}`,
                performedBy: req.user.id,
                performedByName: req.user.name || req.user.email || 'Admin',
                entityId: category._id
            });
        }

        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        console.error('[CategoryController] Error deleting category:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
