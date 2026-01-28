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
        const order = await Order.findById(orderId).populate('clientId', 'name email phoneNumber');

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
        const assetsBase = path.join(__dirname, '..', '..', '..', '..', 'assets');

        // Reverting to standard font for now as the custom NotoSans subset is causing 'squares'
        // Standard fonts (Helvetica) are bulletproof for basic Latin text.
        doc.font('Helvetica');

        // Add logo if it exists
        const logoPath = path.join(assetsBase, 'home_logo_sala.png');
        if (fs.existsSync(logoPath)) {
            // Logo is at 50, 45 with width 80. It should end around Y=125
            doc.image(logoPath, 50, 45, { width: 80 });
        } else {
            // Fallback text logo
            doc.fontSize(25).fillColor('#E91E63').text('SALA', 50, 45);
        }

        doc.fillColor('#444444')
            .fontSize(20)
            .text('RECU DE COMMANDE', 200, 50, { align: 'right' });

        doc.fontSize(10)
            .text(`Date: ${new Date(order.createdAt).toLocaleDateString('fr-FR')}`, 200, 75, { align: 'right' })
            .text(`Commande #: ${order.orderId || order._id}`, 200, 90, { align: 'right' })
            .moveDown();

        // --- CLIENT INFO ---
        // Further increased spacing from logo for a much roomier look
        // Logo ends around 125. Starting at 240 gives a clear separation.
        doc.fillColor('#000000')
            .fontSize(12)
            .text('Informations Client', 50, 240, { underline: true });

        // --- HELPER FUNCTIONS ---
        // Robust cleaning: remove accents and non-standard characters to avoid squares/gibberish in PDF
        const cleanText = (str: string) => {
            if (!str) return "";
            return str
                .replace(/’/g, "'")
                .replace(/[^\x00-\x7F]/g, (char) => {
                    // Normalize and strip accents for characters that have them
                    return char.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
                })
                .replace(/[^\x20-\x7E]/g, ""); // Final pass: remove any remaining non-printable ASCII
        };
        const safeText = (str: any) => str ? cleanText(String(str).trim()) : 'N/A';
        const truncate = (str: string, n: number) => (str.length > n ? str.substr(0, n - 1) + '...' : str);

        // --- COLUMNS LAYOUT ---
        const startY = 270;
        const colWidth = 220;
        const leftX = 50;
        const rightX = 300;

        // Left Column: Client Info
        doc.fontSize(10);
        let currentLeftY = startY;

        const client: any = order.clientId;
        doc.text(`Nom: ${safeText(client?.name)}`, leftX, currentLeftY, { width: colWidth, align: 'left' });
        currentLeftY = doc.y;

        doc.text(`Tel: ${safeText(client?.phoneNumber)}`, leftX, currentLeftY, { width: colWidth, align: 'left' });
        currentLeftY = doc.y;

        // Right Column: Order Details
        doc.fontSize(12)
            .text('Details de la Livraison', rightX, 240, { underline: true });
        // Reset to startY for the right column
        let currentRightY = startY;

        const pickupAddr = truncate(safeText(order.pickupLocation?.address), 60);
        doc.text(`Depart: ${pickupAddr}`, rightX, currentRightY, { width: colWidth, align: 'left' });
        currentRightY = doc.y + 10; // Add small spacing between addresses

        const dropoffAddr = truncate(safeText(order.dropoffLocation?.address), 60);
        doc.text(`Arrivee: ${dropoffAddr}`, rightX, currentRightY, { width: colWidth, align: 'left' });
        currentRightY = doc.y;

        // --- ITEMS TABLE ---
        // Start table below the lowest column
        const tableTop = Math.max(currentLeftY, currentRightY) + 40;

        doc.fontSize(10).fillColor('#444444');
        doc.text('Article', 50, tableTop);
        doc.text('Quantite', 280, tableTop, { width: 90, align: 'right' });
        doc.text('Prix Unit.', 370, tableTop, { width: 90, align: 'right' });
        doc.text('Total', 470, tableTop, { width: 90, align: 'right' });

        doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

        let i = 0;
        doc.fillColor('#000000');
        order.items.forEach((item) => {
            const y = tableTop + 30 + (i * 25);

            // Truncate item name if too long
            const itemName = truncate(safeText(item.name), 40);

            doc.text(itemName, 50, y);
            doc.text(item.quantity.toString(), 280, y, { width: 90, align: 'right' });
            doc.text(`${item.price.toFixed(2)} Dh`, 370, y, { width: 90, align: 'right' });
            doc.text(`${(item.price * item.quantity).toFixed(2)} Dh`, 470, y, { width: 90, align: 'right' });
            i++;
        });

        const subtotalY = tableTop + 40 + (i * 25);
        doc.moveTo(50, subtotalY).lineTo(560, subtotalY).stroke();

        // --- TOTALS ---
        doc.fontSize(10)
            .text('Sous-total:', 370, subtotalY + 15, { width: 90, align: 'right' })
            .text(`${order.pricing.subtotal.toFixed(2)} Dh`, 470, subtotalY + 15, { width: 90, align: 'right' })

            .text('Livraison:', 370, subtotalY + 30, { width: 90, align: 'right' })
            .text(`${order.pricing.deliveryFee.toFixed(2)} Dh`, 470, subtotalY + 30, { width: 90, align: 'right' });

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
