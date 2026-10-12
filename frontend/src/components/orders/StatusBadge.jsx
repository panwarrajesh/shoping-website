import Badge from '../ui/Badge';

const MAP = {
  PENDING: ['amber', 'Confirmation baaki'],
  CONFIRMED: ['green', 'Confirm ho gaya'],
  PROCESSING: ['green', 'Taiyaar ho raha hai'],
  PACKED: ['green', 'Pack ho gaya'],
  SHIPPED: ['green', 'Bheja gaya'],
  OUT_FOR_DELIVERY: ['green', 'Delivery ke liye nikla'],
  DELIVERED: ['green', 'Deliver ho gaya'],
  CANCELLED: ['red', 'Cancel hua'],
  RETURN_REQUESTED: ['amber', 'Return requested'],
  RETURNED: ['gray', 'Return hua'],
  REFUNDED: ['gray', 'Refund hua'],
};

export default function StatusBadge({ status }) {
  const [tone, label] = MAP[status] || ['gray', status];
  return <Badge tone={tone}>{label}</Badge>;
}
