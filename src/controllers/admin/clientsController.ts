import { Request, Response } from 'express';
import Client from '../../models/Client';
import Order from '../../models/Order';

/**
 * @desc    Get all clients with basic stats
 * @route   GET /api/admin/clients
 * @access  Private/Admin
 */
export const getAllClients = async (req: Request, res: Response) => {
    try {
        const clients = await Client.find({}).sort({ createdAt: -1 }).lean();

        const clientsWithStats = await Promise.all(clients.map(async (client: any) => {
            const totalOrders = await Order.countDocuments({ clientId: client._id });
            return {
                id: client._id,
                name: client.name || 'Inconnu',
                phoneNumber: client.phoneNumber,
                email: client.email,
                status: client.status,
                totalOrders,
                lastLogin: client.lastLogin,
                lastConnected: client.lastConnected,
                createdAt: client.createdAt
            };
        }));

        res.status(200).json({
            success: true,
            count: clientsWithStats.length,
            clients: clientsWithStats
        });
    } catch (error: any) {
        console.error('[ADMIN_CLIENTS] Get All Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des clients.' });
    }
};

/**
 * @desc    Get client profile details (Identity, Orders, Complaints)
 * @route   GET /api/admin/clients/:id
 * @access  Private/Admin
 */
export const getClientProfile = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const client = await Client.findById(id).lean();
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client non trouvé.' });
        }

        const orders = await Order.find({ clientId: id }).sort({ createdAt: -1 }).lean();

        res.status(200).json({
            success: true,
            client: {
                ...client,
                id: client._id
            },
            orders,
            complaints: client.complaints || []
        });
    } catch (error: any) {
        console.error('[ADMIN_CLIENTS] Get Profile Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération du profil.' });
    }
};

/**
 * @desc    Update client status (Suspend/Unsuspend)
 * @route   PUT /api/admin/clients/:id/status
 * @access  Private/Admin
 */
export const updateClientStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['Active', 'Suspended'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Statut invalide.' });
        }

        const client = await Client.findByIdAndUpdate(id, { status }, { new: true });
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client non trouvé.' });
        }

        res.status(200).json({
            success: true,
            message: `Compte ${status === 'Suspended' ? 'suspendu' : 'activé'} avec succès.`,
            status: client.status
        });
    } catch (error: any) {
        console.error('[ADMIN_CLIENTS] Update Status Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du statut.' });
    }
};

/**
 * @desc    Permanently delete client and all associated data
 * @route   DELETE /api/admin/clients/:id
 * @access  Private/Admin
 */
export const deleteClient = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const client = await Client.findById(id);
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client non trouvé.' });
        }

        // 1. Delete all associated orders
        await Order.deleteMany({ clientId: id });

        // 2. Delete the client
        await Client.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Client et toutes ses données supprimés avec succès.'
        });
    } catch (error: any) {
        console.error('[ADMIN_CLIENTS] Delete Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la suppression du client.' });
    }
};
