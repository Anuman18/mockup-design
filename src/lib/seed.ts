import { prisma } from './db';

async function seed() {
  console.log('🌱 Seeding Eventelligence database...');

  // Clean slate
  await prisma.logo.deleteMany();
  await prisma.brandingTemplate.deleteMany();
  await prisma.seatingTemplate.deleteMany();
  await prisma.stageTemplate.deleteMany();
  await prisma.venueHall.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.city.deleteMany();

  // Cities
  const mumbai   = await prisma.city.create({ data: { name: 'Mumbai',    state: 'Maharashtra' } });
  const delhi    = await prisma.city.create({ data: { name: 'New Delhi', state: 'Delhi' } });
  const bengaluru = await prisma.city.create({ data: { name: 'Bengaluru', state: 'Karnataka' } });
  const bhopal   = await prisma.city.create({ data: { name: 'Bhopal',    state: 'Madhya Pradesh' } });

  // Venues
  const taj = await prisma.venue.create({
    data: { cityId: mumbai.id, name: 'Taj Lands End', address: 'Bandra West, Mumbai' },
  });
  const jw = await prisma.venue.create({
    data: { cityId: mumbai.id, name: 'JW Marriott Sahar', address: 'IA Project Road, Andheri East, Mumbai' },
  });
  const oberoi = await prisma.venue.create({
    data: { cityId: delhi.id, name: 'The Oberoi New Delhi', address: 'Dr. Zakir Hussain Marg, New Delhi' },
  });
  const itc = await prisma.venue.create({
    data: { cityId: bengaluru.id, name: 'ITC Gardenia', address: 'Residency Road, Bengaluru' },
  });
  const minto = await prisma.venue.create({
    data: { cityId: bhopal.id, name: 'Minto Hall', address: 'Shyamla Hills, Bhopal' },
  });

  // Venue Halls (mask coords are % of image, stored as int pixels for a 1200x800 reference)
  await prisma.venueHall.createMany({
    data: [
      {
        venueId: taj.id, name: 'Grand Ballroom',
        width: 25, length: 45, height: 7.5, capacity: 800,
        baseImageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
        maskX: 260, maskY: 200, maskWidth: 680, maskHeight: 380,
      },
      {
        venueId: taj.id, name: 'Sea View Pavilion',
        width: 20, length: 30, height: 6.0, capacity: 400,
        baseImageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
        maskX: 200, maskY: 150, maskWidth: 800, maskHeight: 350,
      },
      {
        venueId: jw.id, name: 'Grand Ballroom 1 & 2',
        width: 30, length: 50, height: 8.5, capacity: 1200,
        baseImageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
        maskX: 180, maskY: 100, maskWidth: 840, maskHeight: 400,
      },
      {
        venueId: oberoi.id, name: 'Plenary Ballroom',
        width: 28, length: 48, height: 9.0, capacity: 1000,
        baseImageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
        maskX: 300, maskY: 120, maskWidth: 600, maskHeight: 320,
      },
      {
        venueId: itc.id, name: 'Mysore Hall',
        width: 22, length: 38, height: 7.0, capacity: 600,
        baseImageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
        maskX: 360, maskY: 180, maskWidth: 480, maskHeight: 280,
      },
      {
        venueId: minto.id, name: 'Main Hall',
        width: 35, length: 60, height: 10.0, capacity: 2000,
        baseImageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
        maskX: 200, maskY: 80, maskWidth: 800, maskHeight: 480,
      },
    ],
  });

  // Stage Templates
  await prisma.stageTemplate.createMany({
    data: [
      { name: 'Royal Staggered Wood Set', value: 'Royal Wooden Stage', type: 'stage' },
      { name: 'Seamless Gloss Acrylic Set', value: 'Glossy Acrylic Stage', type: 'stage' },
      { name: 'LED Digital Backdrop Truss', value: 'LED Truss Stage', type: 'stage' },
      { name: 'Natural Bamboo & Floral', value: 'Bamboo Floral Stage', type: 'stage' },
      { name: 'Minimalist White Riser', value: 'Minimal White Stage', type: 'stage' },
    ],
  });

  // Seating Templates
  await prisma.seatingTemplate.createMany({
    data: [
      { name: 'Theatre Rows Layout', value: 'Theatre', type: 'seating' },
      { name: 'Cluster Round Tables (Banquet)', value: 'Cluster', type: 'seating' },
      { name: 'Classroom Desks Layout', value: 'Classroom', type: 'seating' },
      { name: 'U-Shape Conference', value: 'U-Shape', type: 'seating' },
      { name: 'Cocktail Standing', value: 'Cocktail', type: 'seating' },
    ],
  });

  // Branding Templates
  const corp = await prisma.brandingTemplate.create({ data: { templateName: 'Corporate Tech Summit' } });
  await prisma.logo.createMany({
    data: [
      { templateId: corp.id, logoName: 'Tata Group' },
      { templateId: corp.id, logoName: 'Reliance Industries' },
      { templateId: corp.id, logoName: 'NASSCOM' },
      { templateId: corp.id, logoName: 'Tech Mahindra' },
    ],
  });

  const gov = await prisma.brandingTemplate.create({ data: { templateName: 'Government Protocol' } });
  await prisma.logo.createMany({
    data: [
      { templateId: gov.id, logoName: 'MP Government' },
      { templateId: gov.id, logoName: 'Digital India' },
      { templateId: gov.id, logoName: 'Startup India' },
    ],
  });

  const fest = await prisma.brandingTemplate.create({ data: { templateName: 'Cultural Festival' } });
  await prisma.logo.createMany({
    data: [
      { templateId: fest.id, logoName: 'Ministry of Culture' },
      { templateId: fest.id, logoName: 'ICCR' },
      { templateId: fest.id, logoName: 'State Tourism Board' },
    ],
  });

  console.log('✅ Seeding complete!');
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
