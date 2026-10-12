const { z } = require('zod');
const { fields } = require('../auth/auth.validation');

const nonEmpty = (v) => Object.keys(v).length > 0;

const emailOrEmpty = z.string().trim().toLowerCase().email('Enter a valid email')
  .or(z.literal('')).transform((v) => (v === '' ? null : v));

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(60).optional(),
  email: emailOrEmpty.optional(),
}).refine(nonEmpty, 'Nothing to update');

const addressBase = z.object({
  fullName: z.string().trim().min(2, 'Enter full name').max(60),
  mobile: fields.mobile,
  line1: z.string().trim().min(3, 'Enter house no. / street').max(120),
  line2: z.string().trim().max(120).optional(),
  landmark: z.string().trim().max(80).optional(),
  city: z.string().trim().min(2, 'Enter city').max(60),
  state: z.string().trim().min(2, 'Select state').max(60),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit pincode'),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  isDefault: z.boolean().optional(),
});

const addressCreateSchema = addressBase;
const addressUpdateSchema = addressBase.partial().refine(nonEmpty, 'Nothing to update');

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password').max(72),
  newPassword: fields.password,
});

module.exports = { profileSchema, addressCreateSchema, addressUpdateSchema, changePasswordSchema };
