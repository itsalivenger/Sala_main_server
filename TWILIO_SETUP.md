# Twilio SMS Integration Setup

## Overview

The SALA server uses Twilio for sending SMS OTPs. The implementation includes a **mock mode** for development/testing that logs OTPs to the console instead of sending real SMS.

## Current Status

✅ **SMS Service Created**: `src/services/smsService.ts`
✅ **Twilio Package Installed**: `npm install twilio`
✅ **Controllers Updated**: Client and Livreur auth controllers now use the SMS service
✅ **Mock Mode Active**: Currently running in MOCK mode for testing

## Configuration

### Environment Variables

Create a `.env` file in the `Sala_main_server` directory (use `.env.example` as template):

```env
# Required
NODE_ENV=development
JWT_SECRET=your-secret-key
MONGODB_URI=mongodb://localhost:27017
DB_NAME=Sala
PORT=5000

# SMS Configuration
USE_MOCK_SMS=true  # Set to 'true' for mock mode, 'false' for real SMS

# Twilio Credentials (only needed when USE_MOCK_SMS=false)
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number
```

## Getting Twilio Credentials

1. **Sign up for Twilio**: https://www.twilio.com/try-twilio
   - Free trial includes $15.00 credit
   - Can send SMS to verified numbers during trial

2. **Get your credentials**:
   - Go to: https://console.twilio.com
   - Find **Account SID** and **Auth Token** on the dashboard
   - Copy these to your `.env` file

3. **Get a phone number**:
   - In Twilio Console, go to **Phone Numbers** → **Buy a Number**
   - Choose a number that supports SMS
   - Copy the number to `TWILIO_PHONE_NUMBER` (include country code, e.g., `+12125551234`)

4. **Add verified numbers** (for free trial):
   - Go to **Phone Numbers** → **Verified Caller IDs**
   - Add phone numbers you want to test with
   - You'll receive a verification code via SMS

## Using Mock Mode (Current Setup)

Mock mode is **enabled by default** and perfect for development:

- ✅ No Twilio account needed
- ✅ No SMS costs
- ✅ OTPs logged to server console
- ✅ All auth flows work normally

### Console Output Example

When an OTP is sent in mock mode:

```
═══════════════════════════════════════════
📱 [MOCK SMS] LIVREUR LOGIN
   To: 0612345678
   OTP Code: 123456
   Message: "Votre code de vérification SALA est: 123456. Valide pendant 10 minutes."
═══════════════════════════════════════════
```

## Switching to Production Mode

When ready to send real SMS:

1. **Update `.env`**:
   ```env
   USE_MOCK_SMS=false
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

2. **Restart the server**:
   ```bash
   npm run dev
   ```

3. **Verify in logs**:
   ```
   ✅ Twilio SMS Service initialized (Production Mode)
   ```

## Testing the Implementation

### Test Login Flow

1. **Start the server** (should show mock mode message):
   ```bash
   npm run dev
   ```

2. **Send a login request**:
   ```bash
   curl -X POST http://localhost:5000/api/livreur/auth/login \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber":"0612345678"}'
   ```

3. **Check server console** for the OTP code

4. **Verify the OTP**:
   ```bash
   curl -X POST http://localhost:5000/api/livreur/auth/verify \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber":"0612345678","code":"123456"}'
   ```

### Test Registration Flow

Same as login flow, but use `/api/livreur/auth/register` endpoint.

## Troubleshooting

### SMS not sending in production mode

1. **Check Twilio credentials**: Verify `ACCOUNT_SID` and `AUTH_TOKEN` are correct
2. **Verify phone number format**: Must include country code (e.g., `+212612345678` for Morocco)
3. **Check Twilio balance**: Free trial has limited credit
4. **Verify destination number**: For trial accounts, destination must be verified

### Fallback Behavior

If Twilio fails in production mode, the service **automatically falls back to mock mode** and logs the OTP to console. Check server logs for error details.

## Code Structure

```
src/
├── services/
│   └── smsService.ts       # SMS service (Twilio + mock)
├── controllers/
│   ├── client_app/
│   │   └── authController.ts  # Uses smsService.sendOTP()
│   └── livreur/
│       └── authController.ts  # Uses smsService.sendOTP()
```

## SMS Service API

```typescript
import smsService from '../services/smsService';

// Send OTP
await smsService.sendOTP(
  phoneNumber,  // "+212612345678" or "0612345678"
  otp,          // "123456"
  context       // "Client Login" (for logging)
);

// Check if in mock mode
const isMock = smsService.isMockMode();
```

## Cost Considerations

- **Twilio Pricing**: ~$0.0075 per SMS in Morocco
- **Free Trial**: $15 credit (~2000 SMS)
- **Production**: Monitor usage in Twilio Console
- **Alternative**: Consider bulk SMS providers for Morocco (e.g., Nexmo, Africa's Talking)

## Next Steps

1. ✅ **Currently in mock mode** - Test all auth flows
2. ⏳ **Get Twilio credentials** - Sign up and configure
3. ⏳ **Test with real SMS** - Start with verified numbers
4. ⏳ **Monitor costs** - Track usage in production
