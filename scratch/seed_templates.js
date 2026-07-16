const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'prisma', 'eventelligence.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${DB_PATH}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding templates database with driver adapter...');

  // Clean old templates
  await prisma.template.deleteMany();

  // Seed Grand Ballroom Template
  await prisma.template.create({
    data: {
      name: 'Grand Ballroom Premium Set',
      category: 'Hotel',
      imageUrl: '/uploads/templates/grand_ballroom.jpg',
      centerMaskX: 560,
      centerMaskY: 240,
      centerMaskWidth: 416,
      centerMaskHeight: 250,
      leftMaskX: 362,
      leftMaskY: 240,
      leftMaskWidth: 128,
      leftMaskHeight: 405,
      rightMaskX: 1073,
      rightMaskY: 240,
      rightMaskWidth: 128,
      rightMaskHeight: 405
    }
  });

  // Seed Convention Center Template
  await prisma.template.create({
    data: {
      name: 'Convention Center Wide Screen',
      category: 'Convention Center',
      imageUrl: '/uploads/templates/grand_ballroom.jpg',
      centerMaskX: 560,
      centerMaskY: 240,
      centerMaskWidth: 416,
      centerMaskHeight: 250,
      leftMaskX: 0,
      leftMaskY: 0,
      leftMaskWidth: 0,
      leftMaskHeight: 0,
      rightMaskX: 0,
      rightMaskY: 0,
      rightMaskWidth: 0,
      rightMaskHeight: 0
    }
  });

  // Seed Corporate Meeting Room
  await prisma.template.create({
    data: {
      name: 'Corporate Meeting Room',
      category: 'Conference',
      imageUrl: '/uploads/templates/grand_ballroom.jpg',
      centerMaskX: 560,
      centerMaskY: 240,
      centerMaskWidth: 416,
      centerMaskHeight: 250,
      leftMaskX: 362,
      leftMaskY: 240,
      leftMaskWidth: 128,
      leftMaskHeight: 405,
      rightMaskX: 1073,
      rightMaskY: 240,
      rightMaskWidth: 128,
      rightMaskHeight: 405
    }
  });

  console.log('Successfully seeded 3 templates!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
