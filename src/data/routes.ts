export const locales = ['sq', 'en'] as const;
export type Locale = (typeof locales)[number];

export const pageKeys = ['home', 'events', 'policy', 'visit', 'privacy'] as const;
export type PageKey = (typeof pageKeys)[number];

export const routes = {
  home: { sq: '/', en: '/en/' },
  events: { sq: '/events/', en: '/en/events/' },
  policy: { sq: '/policy/', en: '/en/policy/' },
  visit: { sq: '/visit/', en: '/en/visit/' },
  privacy: { sq: '/privacy/', en: '/en/privacy/' },
} as const satisfies Record<PageKey, Record<Locale, string>>;

export function routeFor(page: PageKey, locale: Locale): string {
  return routes[page][locale];
}

export function alternateLocale(locale: Locale): Locale {
  return locale === 'sq' ? 'en' : 'sq';
}
