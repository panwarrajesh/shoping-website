const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

// Starter categories. Admin can add/edit/delete these later from the panel.
const tree = {
  Fashion: ['Men', 'Women', 'Kids'],
  Electronics: ['Mobile Accessories', 'Earphones', 'Chargers'],
  Home: ['Furniture', 'Kitchen', 'Decor'],
  Beauty: ['Skincare', 'Haircare'],
  'Local Products': [],
};
// Starting category commission percentages (editable by admin)
const catPercent = { Fashion: 20, Electronics: 8, Home: 12, Beauty: 15, 'Local Products': 10 };
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@localmart.test';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe@123';
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: 'Admin', email, role: 'ADMIN', passwordHash: await bcrypt.hash(password, 12) },
  });

  if (!(await prisma.commission.findFirst({ where: { scope: 'GLOBAL' } }))) {
    await prisma.commission.create({ data: { scope: 'GLOBAL', percent: 30 } });
  }

  let order = 0;
  for (const [parent, children] of Object.entries(tree)) {
    const p = await prisma.category.upsert({
      where: { slug: slugify(parent) }, update: {},
      create: { name: parent, slug: slugify(parent), sortOrder: order++ },
    });
    if (!(await prisma.commission.findFirst({ where: { scope: 'CATEGORY', categoryId: p.id } }))) {
      await prisma.commission.create({ data: { scope: 'CATEGORY', categoryId: p.id, percent: catPercent[parent] } });
    }
    for (const c of children) {
      await prisma.category.upsert({
        where: { slug: slugify(`${parent}-${c}`) }, update: {},
        create: { name: c, slug: slugify(`${parent}-${c}`), parentId: p.id },
      });
    }
  }

  // Starter places (city level). Admin can add more areas later; sellers also create places when they register.
  const places = [
    ['Haryana', 'Palwal', '121102', 28.1487, 77.3320], ['Haryana', 'Hodal', '121106', 27.8944, 77.3688],
    ['Haryana', 'Faridabad', '121001', 28.4089, 77.3178], ['Haryana', 'Gurugram', '122001', 28.4595, 77.0266],
    ['Delhi', 'New Delhi', '110001', 28.6139, 77.2090], ['Uttar Pradesh', 'Noida', '201301', 28.5355, 77.3910],
  ];
  for (const [state, city, pincode, latitude, longitude] of places) {
    await prisma.location.upsert({
      where: { city_area_pincode: { city, area: '', pincode } },
      update: { latitude, longitude },
      create: { state, city, pincode, latitude, longitude },
    });
  }
  console.log('Seed done. Admin:', email);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
