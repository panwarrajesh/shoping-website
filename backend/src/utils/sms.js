const env = require('../config/env');

// Provider switch. Real SMS (MSG91/Twilio etc., with DLT template registration in India)
// is plugged in here in Step 15. Until then OTPs are printed in the server console (dev only).
async function sendSms(mobile, message) {
  if (env.smsProvider === 'console') {
    console.log(`\n[DEV SMS to +91${mobile}] ${message}\n`);
    return;
  }
  throw new Error(`SMS provider "${env.smsProvider}" is not implemented yet`);
}

module.exports = { sendSms };
