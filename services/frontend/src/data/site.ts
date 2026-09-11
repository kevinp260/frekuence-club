export const SITE = {
  name: 'Frekuence Club',
  domain: 'frekuence.club',
  url: 'https://frekuence.club',
  instagram: 'https://www.instagram.com/frekuence.club',
  maps: 'https://www.google.com/maps/place/Frekuence+Club/@41.3084036,19.8115311,16z/data=!3m1!4b1!4m6!3m5!1s0x135031007e3bb467:0x566bcd33792828ad!8m2!3d41.3083996!4d19.814106!16s%2Fg%2F11ys99ypr5',
  address: {
    venue: 'Kompleksi Fari',
    locality: 'Tiranë',
    country: 'Albania',
    countryCode: 'AL',
  },
  coordinates: {
    latitude: 41.3083996,
    longitude: 19.814106,
  },
  timezone: 'Europe/Tirane',
  calibration: 'Club calibrated at 7.83 Hz',
  minimumAge: 18,
  // Owner input required before these may be rendered.
  contact: {
    email: null,
    phone: null,
  },
  practical: {
    accessibility: null,
    transport: null,
    openingHours: null,
  },
} as const;

export const venueStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'NightClub',
  name: SITE.name,
  url: SITE.url,
  description: 'Underground electronic music club for techno and house in Tirana, Albania.',
  address: {
    '@type': 'PostalAddress',
    streetAddress: SITE.address.venue,
    addressLocality: SITE.address.locality,
    addressCountry: SITE.address.countryCode,
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: SITE.coordinates.latitude,
    longitude: SITE.coordinates.longitude,
  },
  hasMap: SITE.maps,
  sameAs: [SITE.instagram],
} as const;
