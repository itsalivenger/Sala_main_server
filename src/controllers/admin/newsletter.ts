import { Request, Response } from 'express';
import Subscriber from '../../models/Subscriber';
import mailService from '../../services/mailService';

// Subscribe to newsletter (Public)
export const subscribe = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            res.status(400).json({ error: 'Email invalide' });
            return;
        }

        const existingSubscriber = await Subscriber.findOne({ email });
        if (existingSubscriber) {
            res.status(200).json({ message: 'Vous êtes déjà abonné!', exists: true });
            return;
        }

        await Subscriber.create({ email });

        res.status(201).json({ message: 'Inscription réussie' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Get all subscribers (Admin)
export const getSubscribers = async (req: Request, res: Response) => {
    try {
        const subscribers = await Subscriber.find({}).sort({ subscribedAt: -1 });
        res.json(subscribers);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Delete subscriber (Admin)
export const deleteSubscriber = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const subscriber = await Subscriber.findByIdAndDelete(id);

        if (!subscriber) {
            res.status(404).json({ error: 'Abonné non trouvé' });
            return;
        }

        res.json({ message: 'Abonné supprimé avec succès' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// Send newsletter broadcast (Admin)
export const sendNewsletter = async (req: Request, res: Response) => {
    try {
        const { subject, content } = req.body;

        if (!subject || !content) {
            res.status(400).json({ error: 'Sujet et contenu requis' });
            return;
        }

        const subscribers = await Subscriber.find({});
        if (subscribers.length === 0) {
            res.status(400).json({ error: 'Aucun abonné trouvé' });
            return;
        }

        const emails = subscribers.map(s => s.email);

        // Send via MailService (which handles branding and no-reply headers)
        const success = await mailService.sendMail({
            bcc: emails,
            subject: subject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #6366f1;">SALA Platform</h2>
                    </div>
                    <div style="line-height: 1.6; color: #333333;">
                        ${content}
                    </div>
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #888888; text-align: center;">
                        <p>© ${new Date().getFullYear()} SALA. Tous droits réservés.</p>
                        <p>Vous recevez cet email car vous êtes abonné à notre newsletter.</p>
                    </div>
                </div>
            `,
        });

        if (!success) {
            throw new Error('MailService failed to send broadcast');
        }

        res.json({ message: `Newsletter envoyée avec succès à ${emails.length} abonnés.` });
    } catch (error: any) {
        console.error('Newsletter Broadcast Error:', error);
        res.status(500).json({ error: 'Échec de l\'envoi de la newsletter. Vérifiez les paramètres SMTP.' });
    }
};
