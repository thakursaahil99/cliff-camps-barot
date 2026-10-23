// Seeds tent types and the admin login. Safe to re-run (existing tents are left untouched).
//   npm run seed            (uses backend/.env: Supabase if configured, else the local JSON store)
import bcrypt from 'bcryptjs';
import { db } from '../src/db/index.js';

// NOTE: tent names/descriptions come from the camp's real content and photos.
// Capacity is 3 guests per tent. Counts and prices are SAMPLE values - change them in Admin -> Tents.
const TENTS = [
  {
    name: 'Riverside Swiss Tent',
    description:
      'Our comfortable Swiss tent by the river - a wooden double bed with fresh white linen and warm blankets, curtained windows, and the constant white noise of the river outside. Wake up to views of snow not far away.',
    capacity: 3,
    price_per_night: 2500,
    units: 4,
    images: ['/images/tent-interior-1280.webp', '/images/camp-yellow-tent-540.webp', '/images/camp-tent-window-540.webp'],
    amenities: ['Double bed with fresh linen', 'Warm blankets', 'Curtained windows', 'Electric point & lighting', 'Riverside location', 'Meals by our in-house chef'],
    sort_order: 1,
    active: true
  }
];

const store = db();
console.log(`Seeding (${store.kind})...`);

for (const tent of TENTS) {
  const existing = await store.findTentByName(tent.name);
  if (existing) console.log(`  = tent "${tent.name}" already exists`);
  else {
    await store.createTent(tent);
    console.log(`  + tent "${tent.name}" (₹${tent.price_per_night}/night, sample price)`);
  }
}

const email = (process.env.ADMIN_EMAIL || 'cliffcampsbarot@gmail.com').toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!password || password.length < 10) {
  console.warn('  ! ADMIN_PASSWORD not set (or under 10 characters) - admin login not created');
} else {
  await store.upsertAdmin(email, await bcrypt.hash(password, 12));
  console.log(`  + admin login: ${email}`);
}
console.log('Done.');
