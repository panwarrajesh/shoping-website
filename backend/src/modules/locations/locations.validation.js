const { z } = require('zod');

const locationFields = {
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit pincode').optional(),
  city: z.string().trim().min(2).max(60).optional(),
};
const bothOrNone = (d) => (d.lat == null) === (d.lng == null);
const bothMsg = { message: 'Send both lat and lng', path: ['lat'] };

const locationQuery = z.object(locationFields).refine(bothOrNone, bothMsg);
const searchQuery = z.object({ q: z.string().trim().max(60).optional(), limit: z.coerce.number().int().min(1).max(20).default(10) });
const reverseQuery = z.object({ lat: locationFields.lat.unwrap().optional(), lng: locationFields.lng.unwrap().optional() })
  .refine((d) => d.lat != null && d.lng != null, { message: 'lat and lng are required' });
const saveSchema = z.object({ locationId: z.string().min(1).max(40) });

module.exports = { locationFields, bothOrNone, bothMsg, locationQuery, searchQuery, reverseQuery, saveSchema };
