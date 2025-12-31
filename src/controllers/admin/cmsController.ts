import { Request, Response } from 'express';
import PageContent from '../../models/PageContent';
import { DEFAULT_CMS_CONTENT } from '../../utils/cmsDefaults';

// @desc    Get page content
// @route   GET /api/admin/cms
// @access  Private/Admin
export const getPageContent = async (req: Request, res: Response) => {
    const { page } = req.query;

    try {
        if (page) {
            const content = await PageContent.findOne({ page });
            return res.status(200).json(content || { page, sections: {} });
        } else {
            const allContent = await PageContent.find({});
            return res.status(200).json(allContent);
        }
    } catch (error) {
        console.error("CMS GET Error:", error);
        res.status(500).json({ error: "Failed to fetch content" });
    }
};

// @desc    Update page content
// @route   POST /api/admin/cms
// @access  Private/Admin
export const updatePageContent = async (req: Request, res: Response) => {
    try {
        const { page, sections } = req.body;

        if (!page || !sections) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const updatedContent = await PageContent.findOneAndUpdate(
            { page },
            { $set: { sections } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.status(200).json(updatedContent);
    } catch (error) {
        console.error("CMS POST Error:", error);
        res.status(500).json({ error: "Failed to update content" });
    }
};

// @desc    Reset page content to default
// @route   POST /api/admin/cms/reset
// @access  Private/Admin
export const resetPageContent = async (req: Request, res: Response) => {
    try {
        const { page } = req.body;

        if (!page) {
            return res.status(400).json({ error: "Missing page parameter" });
        }

        const defaultSections = DEFAULT_CMS_CONTENT[page] || {};

        const resetContent = await PageContent.findOneAndUpdate(
            { page },
            { $set: { sections: defaultSections } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({
            success: true,
            message: `Page ${page} reset to default`,
            content: resetContent
        });
    } catch (error) {
        console.error("CMS Reset Error:", error);
        res.status(500).json({ error: "Failed to reset content" });
    }
};
