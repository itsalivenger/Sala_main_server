import { Request, Response } from 'express';
import Client from '../../models/Client';

/**
 * @desc    Get all notifications for the current client
 * @route   GET /api/client/notifications
 * @access  Private
 */
export const getNotifications = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const client = await Client.findById(userId).select('notifications');

        if (!client) {
            return res.status(404).json({ success: false, message: 'Client non trouvé.' });
        }

        // Sort by newest first
        const sortedNotifications = client.notifications.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        res.status(200).json({
            success: true,
            notifications: sortedNotifications
        });
    } catch (error: any) {
        console.error('[NOTIFICATIONS] Get Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des notifications.' });
    }
};

/**
 * @desc    Mark a notification as read
 * @route   PATCH /api/client/notifications/:id/read
 * @access  Private
 */
export const markAsRead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.id;

        const client = await Client.findById(userId);
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client non trouvé.' });
        }

        const notification = (client.notifications as any).id(id);
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification non trouvée.' });
        }

        notification.isRead = true;
        await client.save();

        res.status(200).json({
            success: true,
            message: 'Notification marquée comme lue.'
        });
    } catch (error: any) {
        console.error('[NOTIFICATIONS] Mark Read Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la notification.' });
    }
};

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/client/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;

        const client = await Client.findById(userId);
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client non trouvé.' });
        }

        client.notifications.forEach(notif => {
            notif.isRead = true;
        });

        await client.save();

        res.status(200).json({
            success: true,
            message: 'Toutes les notifications ont été marquées comme lues.'
        });
    } catch (error: any) {
        console.error('[NOTIFICATIONS] Mark All Read Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des notifications.' });
    }
};
