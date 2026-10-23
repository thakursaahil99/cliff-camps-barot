// Business facts - taken verbatim from the client brief / existing site. Do not invent new ones here.
export const SITE_URL = typeof __SITE_URL__ !== 'undefined' ? __SITE_URL__ : 'https://cliffcamps.netlify.app';

export const BUSINESS = {
  name: 'Cliff Camps, Barot',
  shortName: 'Cliff Camps',
  tagline: 'Riverside Camping in Swiss Tents',
  heroLine: 'Experience Riverside Bliss',
  motto: 'Explore the Nature',
  intro: 'Lose yourself to nature with the constant white noise of the river and views of white snow not far away.',
  phones: [
    { number: '8219850117', name: 'Ashwani' },
    { number: '7018955920', name: 'Anit' }
  ],
  whatsapp: '918219850117',
  whatsappDisplay: '82198 50117',
  email: 'cliffcampsbarot@gmail.com',
  address: 'Old Hatchery, Barot - Lohardi Road',
  region: 'Barot, Mandi, Himachal Pradesh',
  instagram: 'https://www.instagram.com/cliff_camps_117',
  instagramHandle: '@cliff_camps_117',
  airbnb: 'https://www.airbnb.co.in/rooms/1426016597402048000',
  mapEmbed:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3381.8817027477985!2d76.8497811!3d32.0453933!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3904950047db7f93%3A0xacd672c7f0fbae9b!2sCliff%20Camps%20Barot!5e0!3m2!1sen!2sin!4v1749805751350!5m2!1sen!2sin',
  mapLink: 'https://maps.google.com/?cid=12454268022606769819'
};

export const whatsappUrl = (text = 'Hi Cliff Camps! I would like to know more about camping at Barot.') =>
  `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(text)}`;

export const NAV = [
  { to: '/', label: 'Home' },
  { to: '/stay', label: 'Tents & Stay' },
  { to: '/experiences', label: 'Experiences & Food' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/book', label: 'Book & Contact' }
];

const img = (base, widths, w, h) => ({
  src: `/images/${base}-${widths[widths.length - 1]}.webp`,
  srcSet: widths.map((x) => `/images/${base}-${x}.webp ${x}w`).join(', '),
  width: w,
  height: h
});

/**
 * Every photo from the camp's existing website (cliffcamps.netlify.app), plus stills taken from the camp's own
 * video tour on that site. Converted to WebP in several sizes.
 */
export const PHOTOS = {
  tentInterior: { ...img('tent-interior', [640, 1280], 1280, 575), alt: 'Inside a Swiss tent at Cliff Camps: wooden double bed with white linen, warm blanket and curtained windows', category: 'Tents' },
  riverside: { ...img('riverside-camp', [640, 1200], 1200, 1600), alt: 'Colourful Swiss tents beside a still pond reflecting the green cliffs and blue sky of Barot valley', category: 'Camp' },
  riversideWide: { ...img('riverside-camp-wide', [960, 1200], 1200, 760), alt: 'Cliff Camps tents under a green cliff, reflected in the water', category: 'Camp' },
  trout: { ...img('trout', [640, 720], 720, 540), alt: 'Whole grilled trout served on a bed of salad - the in-house chef’s trout treat', category: 'Food' },
  valley: { ...img('barot-valley', [640, 1200], 1200, 795), alt: 'Snow-capped peaks above pine forests and the rocky river at Barot - Lohardi, with the Cliff Camps badge', category: 'Valley' },
  meadow: { ...img('camp-meadow', [540], 538, 785), alt: 'Cliff Camps tents and dining shelter below forested mountains on a sunny day', category: 'Camp' },
  blueTents: { ...img('camp-blue-tents', [540], 538, 785), alt: 'Blue-roofed Swiss tents on the grass at Cliff Camps', category: 'Tents' },
  buddha: { ...img('camp-buddha', [540], 538, 785), alt: 'Buddha statue with plants beside a yellow-roofed tent', category: 'Camp' },
  yellowTent: { ...img('camp-yellow-tent', [540], 538, 785), alt: 'Yellow-roofed Swiss tent under the mountainside', category: 'Tents' },
  pond: { ...img('camp-pond', [540], 538, 785), alt: 'The pond at Cliff Camps with tents along the far bank', category: 'Camp' },
  foodHub: { ...img('camp-food-hub', [540], 538, 785), alt: 'The Cliff Camp Food Hub kitchen hut with its menu board', category: 'Food' },
  lamp: { ...img('camp-lamp', [540], 538, 785), alt: 'Warm pendant lamp under a green canopy at the camp', category: 'Camp' },
  valleyView: { ...img('camp-valley', [540], 538, 785), alt: 'Clouds over the green mountains above the camp', category: 'Valley' },
  tentWindow: { ...img('camp-tent-window', [540], 538, 785), alt: 'Sunlight through a curtained Swiss tent window', category: 'Tents' },
  tentsRow: { ...img('camp-tents-row', [540], 538, 785), alt: 'Row of colourful tents at Cliff Camps with the valley behind', category: 'Camp' },
  fountain: { ...img('camp-fountain', [540], 538, 785), alt: 'Buddha water fountain among the trees at the camp', category: 'Camp' }
};

export const GALLERY = [
  PHOTOS.riverside, PHOTOS.tentInterior, PHOTOS.foodHub, PHOTOS.valley, PHOTOS.blueTents, PHOTOS.trout, PHOTOS.yellowTent,
  PHOTOS.pond, PHOTOS.buddha, PHOTOS.meadow, PHOTOS.tentWindow, PHOTOS.valleyView, PHOTOS.lamp, PHOTOS.tentsRow, PHOTOS.fountain
];

export const VIDEO = { src: '/video/camp-tour.mp4', poster: '/video/camp-tour-poster.webp' };
