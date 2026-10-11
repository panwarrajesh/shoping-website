/* Temporary admin tool until the Admin panel exists (Step 12).
 *   npm run seller:admin -- list
 *   npm run seller:admin -- approve 9876543210
 *   npm run seller:admin -- verify  9876543210     (gives the "Verified Seller" badge)
 *   npm run seller:admin -- reject  9876543210 "reason"
 *   npm run seller:admin -- suspend 9876543210 "reason"
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const [cmd, who, ...rest] = process.argv.slice(2);
const reason = rest.join(' ') || null;

async function find(identifier) {
  const user = await prisma.user.findFirst({
    where: { OR: [{ mobile: String(identifier) }, { email: String(identifier).toLowerCase() }] },
    include: { sellerProfile: true },
  });
  if (!user?.sellerProfile) throw new Error(`No seller found for "${identifier}"`);
  return user.sellerProfile;
}

async function main() {
  if (cmd === 'list') {
    const rows = await prisma.sellerProfile.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { user: true } });
    rows.forEach((s) => console.log(`${s.status.padEnd(10)} verified=${s.isVerified}  ${s.businessName}  (${s.user.mobile || s.user.email})`));
    return;
  }
  const s = await find(who);
  if (cmd === 'approve') {
    await prisma.sellerProfile.update({ where: { id: s.id }, data: { status: 'APPROVED', suspendedReason: null } });
  } else if (cmd === 'verify') {
    await prisma.$transaction([
      prisma.sellerProfile.update({ where: { id: s.id }, data: { status: 'APPROVED', isVerified: true } }),
      prisma.sellerVerification.updateMany({ where: { sellerId: s.id }, data: { status: 'VERIFIED', reviewedAt: new Date() } }),
    ]);
  } else if (cmd === 'reject') {
    await prisma.$transaction([
      prisma.sellerProfile.update({ where: { id: s.id }, data: { status: 'REJECTED' } }),
      prisma.sellerVerification.updateMany({ where: { sellerId: s.id }, data: { status: 'REJECTED', reviewNote: reason, reviewedAt: new Date() } }),
    ]);
  } else if (cmd === 'suspend') {
    await prisma.sellerProfile.update({ where: { id: s.id }, data: { status: 'SUSPENDED', suspendedReason: reason } });
  } else {
    console.log('Usage: list | approve <mobile|email> | verify <..> | reject <..> [reason] | suspend <..> [reason]');
    return;
  }
  console.log(`Done: ${cmd} -> ${s.businessName}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
