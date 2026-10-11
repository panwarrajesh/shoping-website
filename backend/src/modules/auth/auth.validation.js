const { z } = require('zod');
const { normalizeMobile } = require('../../utils/phone');

const mobile = z.string().trim()
  .transform((v) => normalizeMobile(v))
  .refine((v) => v !== null, 'Enter a valid 10-digit mobile number')
  .transform((v) => v);

const password = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

const email = z.string().trim().toLowerCase().email('Enter a valid email')
  .optional().or(z.literal('').transform(() => undefined));

const otp = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit OTP');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(60),
  mobile, email, password,
});

const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter mobile number or email').max(120),
  password: z.string().min(1, 'Enter your password').max(72),
});

const otpSendSchema = z.object({ mobile, purpose: z.enum(['LOGIN', 'REGISTER', 'RESET_PASSWORD']) });
const otpVerifySchema = z.object({ mobile, otp, purpose: z.enum(['LOGIN', 'REGISTER']) });
const resetSchema = z.object({ mobile, otp, newPassword: password });

module.exports = { registerSchema, loginSchema, otpSendSchema, otpVerifySchema, resetSchema };
module.exports.fields = { mobile, password, email, otp };
