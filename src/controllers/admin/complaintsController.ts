import { Request, Response } from 'express';
import Client from '../../models/Client';
import Livreur from '../../models/Livreur';
import { sendPushNotification } from '../../services/notificationService';

/**
 * @desc    Get all complaints from both Clients and Livreurs
 * @route   GET /api/admin/complaints
 * @access  Private/Admin
 */
export const getAllComplaints = async (_req: Request, res: Response) => {
    try {
        const clients = await Client.find({}).lean();
        const livreurs = await Livreur.find({}).lean();

        console.log(`[ADMIN_COMPLAINTS] Found ${clients.length} clients and ${livreurs.length} livreurs (Lean).`);

        const allComplaints: any[] = [];

        clients.forEach((client: any) => {
            if (client.complaints && client.complaints.length > 0) {
                client.complaints.forEach((complaint: any) => {
                    allComplaints.push({
                        ...complaint,
                        _id: complaint._id?.toString() || complaint.id,
                        userId: client._id,
                        userType: 'Client',
                        userName: client.name || 'Inconnu',
                        userPhone: client.phoneNumber
                    });
                });
            }
        });

        livreurs.forEach((livreur: any) => {
            if (livreur.complaints && livreur.complaints.length > 0) {
                livreur.complaints.forEach((complaint: any) => {
                    allComplaints.push({
                        ...complaint,
                        _id: complaint._id?.toString() || complaint.id,
                        userId: livreur._id,
                        userType: 'Livreur',
                        userName: livreur.name || 'Inconnu',
                        userPhone: livreur.phoneNumber
                    });
                });
            }
        });

        console.log(`[ADMIN_COMPLAINTS] Total complaints found: ${allComplaints.length}`);

        // Sort by newest first
        allComplaints.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });

        res.status(200).json({
            success: true,
            count: allComplaints.length,
            complaints: allComplaints
        });
    } catch (error: any) {
        console.error('[ADMIN_COMPLAINTS] Get All Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des plaintes.' });
    }
};

/**
 * @desc    Get a single complaint by ID
 * @route   GET /api/admin/complaints/:id
 * @access  Private/Admin
 */
export const getComplaintById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Try searching in Clients first
        let user = await Client.findOne({ 'complaints._id': id });
        let userType = 'Client';

        if (!user) {
            user = await (Livreur.findOne({ 'complaints._id': id }) as any);
            userType = 'Livreur';
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'Plainte non trouvée.' });
        }

        const complaint = (user.complaints as any).id(id);

        res.status(200).json({
            success: true,
            userType,
            userId: user._id,
            userName: user.name,
            userPhone: user.phoneNumber,
            complaint
        });
    } catch (error: any) {
        console.error('[ADMIN_COMPLAINTS] Get By ID Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération de la plainte.' });
    }
};

/**
 * @desc    Update complaint status
 * @route   PUT /api/admin/complaints/:id/status
 * @access  Private/Admin
 */
export const updateComplaintStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['Open', 'In Progress', 'Resolved'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Statut invalide.' });
        }

        // Search and update in either collection
        let user = await Client.findOne({ 'complaints._id': id });
        if (user) {
            const complaint = (user.complaints as any).id(id);
            complaint.status = status;
            await user.save();
        } else {
            user = await (Livreur.findOne({ 'complaints._id': id }) as any);
            if (user) {
                const complaint = (user.complaints as any).id(id);
                complaint.status = status;
                await user.save();
            } else {
                return res.status(404).json({ success: false, message: 'Plainte non trouvée.' });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Statut mis à jour avec succès.',
            status
        });
    } catch (error: any) {
        console.error('[ADMIN_COMPLAINTS] Update Status Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du statut.' });
    }
};

/**
 * @desc    Add admin note/message to complaint
 * @route   POST /api/admin/complaints/:id/messages
 * @access  Private/Admin
 */
export const addComplaintMessage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ success: false, message: 'Le texte du message est obligatoire.' });
        }

        let user = await Client.findOne({ 'complaints._id': id });
        if (user) {
            const complaint = (user.complaints as any).id(id);
            complaint.messages.push({
                sender: 'Support',
                text,
                createdAt: new Date()
            });

            // Add notification for the user
            user.notifications.push({
                title: 'Nouveau message du support',
                message: `Réponse à votre réclamation: "${complaint.subject}"`,
                type: 'General',
                isRead: false,
                createdAt: new Date()
            });

            await user.save();

            // Send real Push Notification
            if (user.pushToken) {
                await sendPushNotification(
                    user.pushToken,
                    'Nouveau message du support',
                    `Réponse à votre réclamation: "${complaint.subject}"`,
                    { complaintId: id }
                );
            }
        } else {
            user = await (Livreur.findOne({ 'complaints._id': id }) as any);
            if (user) {
                const complaint = (user.complaints as any).id(id);
                complaint.messages.push({
                    sender: 'Support',
                    text,
                    createdAt: new Date()
                });

                // Add notification for the livreur
                user.notifications.push({
                    title: 'Nouveau message du support',
                    message: `Réponse à votre réclamation: "${complaint.subject}"`,
                    type: 'General',
                    isRead: false,
                    createdAt: new Date()
                });

                await user.save();

                // Send real Push Notification
                if (user.pushToken) {
                    await sendPushNotification(
                        user.pushToken,
                        'Nouveau message du support',
                        `Réponse à votre réclamation: "${complaint.subject}"`,
                        { complaintId: id }
                    );
                }
            } else {
                return res.status(404).json({ success: false, message: 'Plainte non trouvée.' });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Message ajouté avec succès.'
        });
    } catch (error: any) {
        console.error('[ADMIN_COMPLAINTS] Add Message Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout du message.' });
    }
};
