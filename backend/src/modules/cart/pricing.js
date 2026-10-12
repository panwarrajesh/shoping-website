// Money rules shared by the cart now and by checkout/orders later, so both always agree.
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const unitPrice = (variant, product) => round2(variant.price != null ? variant.price : product.basePrice);
const unitMrp = (variant, product) => round2(variant.mrp != null ? variant.mrp : product.mrp);

// Seller's delivery zone decides the charge; free above a threshold if the seller set one
const deliveryCharge = (zone, subtotal) => {
  if (!zone || subtotal <= 0) return 0;
  const free = zone.freeDeliveryAbove != null ? Number(zone.freeDeliveryAbove) : null;
  if (free != null && subtotal >= free) return 0;
  return round2(zone.deliveryCharge);
};

module.exports = { round2, unitPrice, unitMrp, deliveryCharge };
