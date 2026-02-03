import { Request, Response } from 'express';
import Faq from '../../models/Faq';

export const getFaqs = async (req: Request, res: Response) => {
    try {
        const faqs = await Faq.find().sort({ category: 1, order: 1 });
        res.json({ success: true, faqs });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createFaq = async (req: Request, res: Response) => {
    try {
        const { question, answer, category, order } = req.body;

        // Strict 3-language validation as requested
        const langs = ['fr', 'ar', 'en'];
        for (const lang of langs) {
            if (!question?.[lang] || !answer?.[lang]) {
                return res.status(400).json({
                    success: false,
                    message: `Toutes les langues (FR, AR, EN) sont obligatoires pour la question et la réponse. Manquant: ${lang.toUpperCase()}`
                });
            }
        }

        const faq = new Faq({
            question,
            answer,
            category,
            order
        });

        await faq.save();
        res.json({ success: true, faq });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateFaq = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { question, answer, category, order, isActive } = req.body;

        // Optional validation if they are providing updates: if question or answer is provided, all langs must be there
        if (question || answer) {
            const langs = ['fr', 'ar', 'en'];
            for (const lang of langs) {
                if ((question && !question[lang]) || (answer && !answer[lang])) {
                    return res.status(400).json({
                        success: false,
                        message: `Toutes les langues (FR, AR, EN) sont obligatoires. Manquant: ${lang.toUpperCase()}`
                    });
                }
            }
        }

        const faq = await Faq.findByIdAndUpdate(
            id,
            { question, answer, category, order, isActive },
            { new: true }
        );

        if (!faq) {
            return res.status(404).json({ success: false, message: "FAQ non trouvée" });
        }

        res.json({ success: true, faq });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteFaq = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const faq = await Faq.findByIdAndDelete(id);

        if (!faq) {
            return res.status(404).json({ success: false, message: "FAQ non trouvée" });
        }

        res.json({ success: true, message: "FAQ supprimée avec succès" });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Public method to get active FAQs
export const getPublicFaqs = async (req: Request, res: Response) => {
    try {
        const faqs = await Faq.find({ isActive: true }).sort({ category: 1, order: 1 });
        res.json({ success: true, faqs });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
