import nodemailer from 'nodemailer';

interface MailOptions {
    to?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
    subject: string;
    html: string;
    text?: string;
}

class MailService {
    private transporter: nodemailer.Transporter;
    private fromName: string;
    private fromAddress: string;
    private replyTo: string;

    constructor() {
        this.fromName = process.env.EMAIL_FROM_NAME || 'SALA';
        this.fromAddress = process.env.EMAIL_FROM_ADDRESS || 'newsletter@sala.com';
        this.replyTo = process.env.EMAIL_REPLY_TO || 'noreply@sala.com';

        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: Number(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Verify connection on startup
        this.verifyConnection();
    }

    private async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Mail Service initialized and SMTP connected');
        } catch (error: any) {
            console.error('❌ Mail Service SMTP Connection Error:', error.message);
        }
    }

    /**
     * Send an email with global branding and no-reply configuration
     */
    async sendMail(options: MailOptions): Promise<boolean> {
        try {
            const mailOptions = {
                from: `"${this.fromName}" <${this.fromAddress}>`,
                replyTo: options.replyTo || this.replyTo,
                to: options.to,
                bcc: options.bcc,
                subject: options.subject,
                html: options.html,
                text: options.text,
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email sent: ${info.messageId}`);
            return true;
        } catch (error: any) {
            console.error('❌ Failed to send email:', error.message);
            return false;
        }
    }
}

// Singleton instance
const mailService = new MailService();
export default mailService;
