const { z } = require('zod');

const nonEmpty = (v) => Object.keys(v).length > 0;
const upper = (s) => s.trim().toUpperCase();

const pan = z.string().transform(upper).pipe(z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Enter a valid PAN (example: ABCDE1234F)'));
const ifsc = z.string().transform(upper).pipe(z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC (example: SBIN0001234)'));
const gstin = z.union([
  z.literal(''),
  z.string().transform(upper).pipe(z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Enter a valid 15-character GSTIN')),
]);
const upi = z.union([z.literal(''), z.string().trim().regex(/^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/, 'Enter a valid UPI ID (example: name@upi)')]);
const accountNumber = z.string().trim().regex(/^\d{9,18}$/, 'Account number must be 9 to 18 digits');

const location = {
  addressLine: z.string().trim().min(3, 'Enter shop/house address').max(150),
  area: z.string().trim().max(80).optional(),
  city: z.string().trim().min(2, 'Enter city').max(60),
  state: z.string().trim().min(2, 'Select state').max(60),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit pincode'),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
};

const delivery = {
  radiusKm: z.number().int('Radius must be a whole number').min(1, 'Minimum radius is 1 km').max(100, 'Maximum radius is 100 km'),
  deliveryCharge: z.number().min(0).max(1000),
  freeDeliveryAbove: z.number().min(0).max(100000).nullable().optional(),
  codAvailable: z.boolean(),
  etaDays: z.number().int().min(1).max(10),
};

const registerSchema = z.object({
  businessName: z.string().trim().min(3, 'Business name must be at least 3 characters').max(80),
  description: z.string().trim().max(500).optional(),
  ...location,
  ...delivery,
  panNumber: pan,
  gstin: gstin.optional(),
  accountName: z.string().trim().min(2, 'Enter account holder name').max(80),
  accountNumber,
  ifsc,
  upiId: upi.optional(),
  acceptTerms: z.boolean().refine((v) => v === true, 'Please accept the seller terms'),
});

const updateProfileSchema = z.object({
  businessName: z.string().trim().min(3).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  gstin: gstin.optional(),
  addressLine: location.addressLine.optional(),
  area: location.area,
  city: location.city.optional(),
  state: location.state.optional(),
  pincode: location.pincode.optional(),
  latitude: location.latitude,
  longitude: location.longitude,
}).refine(nonEmpty, 'Nothing to update');

const deliverySchema = z.object(delivery);

const payoutSchema = z.object({
  accountName: z.string().trim().min(2, 'Enter account holder name').max(80),
  accountNumber,
  ifsc,
  upiId: upi.optional(),
  password: z.string().min(1, 'Enter your password to confirm').max(72),
});

const kycSchema = z.object({ panNumber: pan });

module.exports = { registerSchema, updateProfileSchema, deliverySchema, payoutSchema, kycSchema };
