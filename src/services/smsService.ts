import twilio from 'twilio';

interface SMSServiceConfig {
    accountSid?: string;
    authToken?: string;
    phoneNumber?: string;
    useMock?: boolean;
}

/**
 * Convert Moroccan phone number to international format
 * Input: 0612345678  Output: +212612345678
 */
const formatToInternational = (phone: string): string => {
    // Remove leading 0 and add +212 prefix
    if (phone.startsWith('0')) {
        return `+212${phone.substring(1)}`;
    }
    // If already has +212, return as is
    if (phone.startsWith('+212')) {
        return phone;
    }
    // Otherwise, assume it's without 0 prefix
    return `+212${phone}`;
};

class SMSService {
    private client: any;
    private fromNumber: string;
    private useMock: boolean;

    constructor(config: SMSServiceConfig) {
        this.useMock = config.useMock || !config.accountSid || !config.authToken;
        this.fromNumber = config.phoneNumber || '';

        if (!this.useMock && config.accountSid && config.authToken) {
            this.client = twilio(config.accountSid, config.authToken);
            console.log('✅ Twilio SMS Service initialized (Production Mode)');
        } else {
            console.log('⚠️  SMS Service running in MOCK MODE - OTPs will be logged to console');
        }
    }

    /**
     * Send OTP via SMS
     * @param phoneNumber - Recipient phone number
     * @param otp - The OTP code to send
     * @param context - Context for logging (e.g., 'login', 'registration')
     */
    async sendOTP(phoneNumber: string, otp: string, context: string = 'authentication'): Promise<boolean> {
        try {
            // Format phone to international format for Twilio
            const formattedPhone = formatToInternational(phoneNumber);

            if (this.useMock) {
                // Mock mode - just log the OTP
                console.log('═══════════════════════════════════════════');
                console.log(`📱 [MOCK SMS] ${context.toUpperCase()}`);
                console.log(`   To: ${phoneNumber} (formatted: ${formattedPhone})`);
                console.log(`   OTP Code: ${otp}`);
                console.log(`   Message: "Votre code de vérification SALA est: ${otp}. Valide pendant 10 minutes."`);
                console.log('═══════════════════════════════════════════');
                return true;
            }

            // Production mode - send via Twilio
            const message = await this.client.messages.create({
                body: `Votre code de vérification SALA est: ${otp}. Valide pendant 10 minutes.`,
                from: this.fromNumber,
                to: formattedPhone  // Use formatted international number
            });

            console.log(`✅ SMS sent successfully via Twilio. SID: ${message.sid}`);
            return true;

        } catch (error: any) {
            console.error('❌ SMS Service Error:', error.message);

            // If Twilio fails, fallback to mock
            if (!this.useMock) {
                console.warn('⚠️  Twilio failed, falling back to MOCK mode');
                console.log('═══════════════════════════════════════════');
                console.log(`📱 [FALLBACK MOCK SMS] ${context.toUpperCase()}`);
                console.log(`   To: ${phoneNumber}`);
                console.log(`   OTP Code: ${otp}`);
                console.log('═══════════════════════════════════════════');
            }

            return false;
        }
    }

    /**
     * Check if service is in mock mode
     */
    isMockMode(): boolean {
        return this.useMock;
    }
}

// Initialize SMS service from environment variables
const smsService = new SMSService({
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    useMock: process.env.USE_MOCK_SMS === 'true' || process.env.NODE_ENV === 'development'
});

export default smsService;
