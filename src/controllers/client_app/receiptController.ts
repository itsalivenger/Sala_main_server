import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import Order from '../../models/Order';
import path from 'path';
import fs from 'fs';
const ArabicReshaper = require('arabic-persian-reshaper');
const bidi = require('bidi-js');
const bidiEngine = bidi();

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

        const doc = new PDFDocument({ margin: 50 });

        // Set response headers
        const filename = `Recu_SALA_${order.orderId || orderId.slice(-4)}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        // Pipe the PDF into the response
        doc.pipe(res);

        // --- HEADER ---
        const assetsBase = path.join(__dirname, '..', '..', '..', 'assets');
        const publicBase = path.join(__dirname, '..', '..', '..', 'public');
        const arabicFontPath = path.join(publicBase, 'NotoSansArabic-Regular.ttf');

        // Register Fonts
        doc.registerFont('Arabic', arabicFontPath);
        doc.font('Helvetica');

        // Helper for Arabic support
        const processArabic = (text: string) => {
            if (!text) return "";
            // Check if contains Arabic characters
            const hasArabic = /[\u0600-\u06FF]/.test(text);
            if (!hasArabic) return text;

            try {
                // 1. Reshape the text (handles connected letters)
                const reshaper = new ArabicReshaper();
                const reshaped = reshaper.reshape(text);

                // 2. Apply Bidi logic (RTL ordering)
                const bidiResult = bidiEngine.getReorderData(reshaped);
                return bidiResult.reorderedText;
            } catch (err) {
                console.error('[PDF] Arabic Processing Error:', err);
                return text;
            }
        };

        // Use Arabic font globally or per line? 
        const writeText = (text: string, x?: number, y?: number, options?: any) => {
            const isArabic = /[\u0600-\u06FF]/.test(text);
            const processed = processArabic(text);

            if (isArabic) {
                doc.font('Arabic');
            } else {
                doc.font('Helvetica');
            }

            if (x !== undefined && y !== undefined) {
                doc.text(processed, x, y, options);
            } else {
                doc.text(processed, options);
            }

            // Revert to Helvetica
            doc.font('Helvetica');
        };

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
        doc.fillColor('#000000')
            .fontSize(12);
        writeText('Informations Client', 50, 240, { underline: true });

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
        writeText(`Nom: ${client?.name || 'N/A'}`, leftX, currentLeftY, { width: colWidth, align: 'left' });
        currentLeftY = doc.y;

        writeText(`Tel: ${client?.phoneNumber || 'N/A'}`, leftX, currentLeftY, { width: colWidth, align: 'left' });
        currentLeftY = doc.y;

        // Right Column: Order Details
        doc.fontSize(12);
        writeText('Details de la Livraison', rightX, 240, { underline: true });

        // Reset to startY for the right column
        let currentRightY = startY;

        const pickupAddr = truncate(order.pickupLocation?.address || '', 60);
        writeText(`Depart: ${pickupAddr}`, rightX, currentRightY, { width: colWidth, align: 'left' });
        currentRightY = doc.y + 10; // Add small spacing between addresses

        const dropoffAddr = truncate(order.dropoffLocation?.address || '', 60);
        writeText(`Arrivee: ${dropoffAddr}`, rightX, currentRightY, { width: colWidth, align: 'left' });
        currentRightY = doc.y;

        // --- ITEMS TABLE ---
        // Start table below the lowest column
        const tableTop = Math.max(currentLeftY, currentRightY) + 40;

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

            // Truncate item name if too long
            const itemName = truncate(item.name || '', 40);

            writeText(itemName, 50, y);
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
            writeText(`${order.pricing.tax} Dh`, 470, subtotalY + 45, { width: 90, align: 'right' });
        }

        doc.fontSize(14).fillColor('#E91E63');
        writeText('TOTAL:', 370, subtotalY + 65, { width: 90, align: 'right' });
        writeText(`${order.pricing.total} Dh`, 470, subtotalY + 65, { width: 90, align: 'right' });

        // --- FOOTER ---
        doc.fillColor('#aaaaaa')
            .fontSize(10);
        writeText('Merci d\'avoir choisi SALA. Pour toute question, contactez notre support.', 50, 700, { align: 'center', width: 500 });

        // End the document
        doc.end();

    } catch (error) {
        console.error('[ReceiptController] Error generating receipt:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la génération du reçu' });
    }
};
