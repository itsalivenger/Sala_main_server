import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import Order from '../../models/Order';
import path from 'path';
import fs from 'fs';

/**
 * GET /api/client/orders/:id/receipt
 * Generates and downloads a PDF receipt for a specific order
 */
export const downloadReceipt = async (req: Request, res: Response) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId).populate('clientId', 'firstName lastName email phoneNumber');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Commande non trouvée' });
        }

        // Create a new PDF document
        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        const filename = `Recu_SALA_${order.orderId || orderId.slice(-4)}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        // Pipe the PDF into the response
        doc.pipe(res);

        // --- HEADER ---
        // Add logo if it exists
        // The project structure: Sala_client_app/Sala_main_server and Sala_client_app/assets
        const logoPath = path.join(process.cwd(), '..', 'assets', 'home_sala_noBg.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 45, { width: 60 });
        } else {
            // Fallback text logo
            doc.fontSize(25).fillColor('#E91E63').text('SALA', 50, 45);
        }

        doc.fillColor('#444444')
            .fontSize(20)
            .text('REÇU DE COMMANDE', 200, 50, { align: 'right' });

        doc.fontSize(10)
            .text(`Date: ${new Date(order.createdAt).toLocaleDateString('fr-FR')}`, 200, 75, { align: 'right' })
            .text(`Commande #: ${order.orderId || order._id}`, 200, 90, { align: 'right' })
            .moveDown();

        // --- CLIENT INFO ---
        doc.fillColor('#000000')
            .fontSize(12)
            .text('Informations Client', 50, 130, { underline: true });

        const client: any = order.clientId;
        doc.fontSize(10)
            .text(`Nom: ${client?.firstName || ''} ${client?.lastName || 'Client SALA'}`, 50, 150)
            .text(`Email: ${client?.email || 'N/A'}`, 50, 165)
            .text(`Tel: ${client?.phoneNumber || 'N/A'}`, 50, 180);

        // --- ORDER DETAILS ---
        doc.fontSize(12)
            .text('Détails de la Livraison', 300, 130, { underline: true });

        doc.fontSize(10)
            .text(`Départ: ${order.pickupLocation?.address || 'N/A'}`, 300, 150, { width: 250 })
            .text(`Arrivée: ${order.dropoffLocation?.address || 'N/A'}`, 300, 165, { width: 250 });

        doc.moveDown();

        // --- ITEMS TABLE ---
        const tableTop = 230;
        doc.fontSize(10).fillColor('#444444');
        doc.text('Article', 50, tableTop);
        doc.text('Quantité', 280, tableTop, { width: 90, align: 'right' });
        doc.text('Prix Unitaire', 370, tableTop, { width: 90, align: 'right' });
        doc.text('Total', 470, tableTop, { width: 90, align: 'right' });

        doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

        let i = 0;
        order.items.forEach((item) => {
            const y = tableTop + 25 + (i * 25);
            doc.fillColor('#000000');
            doc.text(item.name, 50, y);
            doc.text(item.quantity.toString(), 280, y, { width: 90, align: 'right' });
            doc.text(`${item.price} Dh`, 370, y, { width: 90, align: 'right' });
            doc.text(`${item.price * item.quantity} Dh`, 470, y, { width: 90, align: 'right' });
            i++;
        });

        const subtotalY = tableTop + 35 + (i * 25);
        doc.moveTo(50, subtotalY).lineTo(560, subtotalY).stroke();

        // --- TOTALS ---
        doc.fontSize(10)
            .text('Sous-total:', 370, subtotalY + 15, { width: 90, align: 'right' })
            .text(`${order.pricing.subtotal} Dh`, 470, subtotalY + 15, { width: 90, align: 'right' })

            .text('Frais de livraison:', 370, subtotalY + 30, { width: 90, align: 'right' })
            .text(`${order.pricing.deliveryFee} Dh`, 470, subtotalY + 30, { width: 90, align: 'right' });

        if (order.pricing.tax > 0) {
            doc.text('TVA:', 370, subtotalY + 45, { width: 90, align: 'right' })
                .text(`${order.pricing.tax} Dh`, 470, subtotalY + 45, { width: 90, align: 'right' });
        }

        doc.fontSize(14).fillColor('#E91E63')
            .text('TOTAL:', 370, subtotalY + 65, { width: 90, align: 'right' })
            .text(`${order.pricing.total} Dh`, 470, subtotalY + 65, { width: 90, align: 'right' });

        // --- FOOTER ---
        doc.fillColor('#aaaaaa')
            .fontSize(10)
            .text('Merci d\'avoir choisi SALA. Pour toute question, contactez notre support.', 50, 700, { align: 'center', width: 500 });

        // End the document
        doc.end();

    } catch (error) {
        console.error('[ReceiptController] Error generating receipt:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la génération du reçu' });
    }
};
