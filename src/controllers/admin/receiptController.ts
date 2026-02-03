import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import Order from '../../models/Order';
import path from 'path';
import fs from 'fs';

/**
 * GET /api/admin/orders/:id/receipt
 * Generates and downloads a PDF receipt for a specific order (Admin version)
 * Simplified Version: Strips Arabic characters to ensure stability and correct formatting.
 */
export const downloadReceipt = async (req: Request, res: Response) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId).populate('clientId', 'name email phoneNumber');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Commande non trouvée' });
        }

        if (order.status !== 'DELIVERED' && order.status !== 'COMPLETED') {
            return res.status(400).json({ success: false, message: 'Le reçu est uniquement disponible pour les commandes livrées' });
        }

        const doc = new PDFDocument({ margin: 50 });

        const filename = `Recu_SALA_ADMIN_${order.orderId || orderId.slice(-4)}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        doc.pipe(res);

        // --- PATH CONFIG ---
        const serverRoot = path.join(__dirname, '..', '..', '..');
        const projectRoot = path.join(serverRoot, '..');
        const candidateLogosBase = path.join(projectRoot, 'public', 'candidate_logos');
        // We stick to standard fonts (Helvetica) to avoid any embedding/reshaping issues
        doc.font('Helvetica');

        // Helper: Strip Arabic characters to "ignore" them and preserve layout
        const cleanText = (text: string) => {
            if (!text) return "";
            // Replace Arabic Unicode ranges with empty string
            // Ranges: Standard Arabic, Supplement, Extended-A, Presentation Forms-A, Presentation Forms-B
            return text.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, '').trim();
        };

        const writeText = (text: string, x?: number, y?: number, options?: any) => {
            if (!text) return;
            const safeText = cleanText(text);
            if (!safeText) return; // Skip if text becomes empty

            if (x !== undefined && y !== undefined) {
                doc.text(safeText, x, y, options);
            } else {
                doc.text(safeText, options);
            }
        };

        // --- CONTENT ---

        // Logo
        const logoPath = path.join(candidateLogosBase, 'logo_sala.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 45, { width: 80 });
        } else {
            doc.fontSize(25).fillColor('#E91E63').text('SALA', 50, 45);
        }

        doc.fillColor('#444444').fontSize(20).text('RECU DE COMMANDE', 200, 50, { align: 'right' });

        doc.fontSize(10)
            .text(`Date: ${new Date(order.createdAt).toLocaleDateString('fr-FR')}`, 200, 75, { align: 'right' })
            .text(`Commande #: ${order.orderId || order._id}`, 200, 90, { align: 'right' })
            .moveDown();

        doc.fillColor('#000000').fontSize(12);
        writeText('Informations Client', 50, 200, { underline: true });

        const startY = 230;
        const colWidth = 220;
        const leftX = 50;
        const rightX = 300;

        doc.fontSize(10);
        const client: any = order.clientId;
        // The cleanText helper inside writeText will ensure only Latin name/phone parts are shown
        writeText(`Nom: ${client?.name || 'N/A'}`, leftX, startY);
        writeText(`Tel: ${client?.phoneNumber || 'N/A'}`, leftX, doc.y + 5);

        writeText('Details de la Livraison', rightX, 200, { underline: true });
        const truncate = (str: string, n: number) => (str.length > n ? str.substr(0, n - 1) + '...' : str);

        writeText(`Depart: ${truncate(order.pickupLocation?.address || '', 60)}`, rightX, startY, { width: colWidth });
        writeText(`Arrivee: ${truncate(order.dropoffLocation?.address || '', 60)}`, rightX, doc.y + 5, { width: colWidth });

        // --- ITEMS TABLE ---
        const tableTop = Math.max(doc.y, startY + 40) + 40;
        doc.fontSize(10).fillColor('#444444');
        writeText('Article', 50, tableTop);
        writeText('Quantite', 280, tableTop, { width: 90, align: 'right' });
        writeText('Prix Unit.', 370, tableTop, { width: 90, align: 'right' });
        writeText('Total', 470, tableTop, { width: 90, align: 'right' });

        doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

        let i = 0;
        doc.fillColor('#000000');
        order.items.forEach((item) => {
            const y = tableTop + 30 + (i * 25);
            writeText(truncate(item.name || '', 40), 50, y);
            writeText(item.quantity.toString(), 280, y, { width: 90, align: 'right' });
            writeText(`${item.price.toFixed(2)} Dh`, 370, y, { width: 90, align: 'right' });
            writeText(`${(item.price * item.quantity).toFixed(2)} Dh`, 470, y, { width: 90, align: 'right' });
            i++;
        });

        const subtotalY = tableTop + 40 + (i * 25);
        doc.moveTo(50, subtotalY).lineTo(560, subtotalY).stroke();

        // --- TOTALS ---
        doc.fontSize(10);
        writeText('Sous-total:', 370, subtotalY + 15, { width: 90, align: 'right' });
        writeText(`${order.pricing.subtotal.toFixed(2)} Dh`, 470, subtotalY + 15, { width: 90, align: 'right' });

        writeText('Livraison:', 370, subtotalY + 30, { width: 90, align: 'right' });
        writeText(`${order.pricing.deliveryFee.toFixed(2)} Dh`, 470, subtotalY + 30, { width: 90, align: 'right' });

        if (order.pricing.tax > 0) {
            writeText('TVA:', 370, subtotalY + 45, { width: 90, align: 'right' });
            writeText(`${order.pricing.tax.toFixed(2)} Dh`, 470, subtotalY + 45, { width: 90, align: 'right' });
        }

        doc.fontSize(14).fillColor('#E91E63');
        writeText('TOTAL:', 370, subtotalY + 65, { width: 90, align: 'right' });
        writeText(`${order.pricing.total.toFixed(2)} Dh`, 470, subtotalY + 65, { width: 90, align: 'right' });

        doc.fillColor('#aaaaaa').fontSize(10);
        writeText('Document généré par l\'administration SALA.', 50, 700, { align: 'center', width: 500 });
        doc.end();

    } catch (error) {
        console.error('[AdminReceiptController] Error:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la génération du reçu' });
    }
};
