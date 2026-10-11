/* Temporary admin tool until the Admin panel exists (Step 12).
 *   npm run product:admin -- list
 *   npm run product:admin -- approve <productId|all>
 *   npm run product:admin -- verify  <productId>        (gives the "Verified Product" badge)
 *   npm run product:admin -- reject  <productId> "reason"
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const [cmd, id, ...rest] = process.argv.slice(2);
const reason = rest.join(' ') || 'Photos or details are not clear';

async function main() {
  if (cmd === 'list') {
    const rows = await prisma.product.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 50, include: { seller: true } });
    rows.forEach((p) => console.log(`${p.status.padEnd(15)} verified=${p.isVerified}  ${p.id}  ${p.title}  (${p.seller.businessName})`));
  } else if (cmd === 'approve' && id === 'all') {
    const r = await prisma.product.updateMany({ where: { status: 'PENDING_REVIEW', deletedAt: null }, data: { status: 'ACTIVE', rejectionReason: null } });
    console.log(`Approved ${r.count} products`);
  } else if (cmd === 'approve') {
    await prisma.product.update({ where: { id }, data: { status: 'ACTIVE', rejectionReason: null } });
    console.log('Approved');
  } else if (cmd === 'verify') {
    await prisma.$transaction([
      prisma.product.update({ where: { id }, data: { status: 'ACTIVE', isVerified: true, rejectionReason: null } }),
      prisma.productVerification.upsert({ where: { productId: id }, update: { status: 'VERIFIED', reviewedAt: new Date() }, create: { productId: id, status: 'VERIFIED', reviewedAt: new Date() } }),
    ]);
    console.log('Verified');
  } else if (cmd === 'reject') {
    await prisma.$transaction([
      prisma.product.update({ where: { id }, data: { status: 'REJECTED', isVerified: false, rejectionReason: reason } }),
      prisma.productVerification.upsert({ where: { productId: id }, update: { status: 'REJECTED', reviewNote: reason, reviewedAt: new Date() }, create: { productId: id, status: 'REJECTED', reviewNote: reason, reviewedAt: new Date() } }),
    ]);
    console.log('Rejected');
  } else {
    console.log('Usage: list | approve <id|all> | verify <id> | reject <id> [reason]');
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
