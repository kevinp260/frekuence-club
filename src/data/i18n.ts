import type { PageKey, Locale } from './routes.ts';

type SeoCopy = Record<PageKey, { title: string; description: string }>;

type Signal = {
  title: string;
  body: string;
};

type Dictionary = {
  documentLang: 'sq-AL' | 'en';
  localeName: string;
  alternateLocaleName: string;
  seo: SeoCopy;
  global: {
    skip: string;
    navigation: string;
    openMenu: string;
    closeMenu: string;
    nav: Record<'events' | 'policy' | 'visit', string>;
    footerNavigation: string;
    privacy: string;
    instagram: string;
    languageSwitch: string;
    address: string;
    age: string;
    copyright: string;
  };
  common: {
    eyebrow: string;
    events: string;
    policy: string;
    visit: string;
    privacy: string;
    learnMore: string;
    directions: string;
    instagram: string;
    reservationsStatus: string;
    physicalId: string;
    noMedia: string;
  };
  home: {
    heroKicker: string;
    heroTitle: string;
    heroLocation: string;
    heroCalibration: string;
    heroAge: string;
    eventsKicker: string;
    eventsTitle: string;
    eventsEmpty: string;
    eventsNote: string;
    manifestoKicker: string;
    manifestoTitle: string;
    manifestoLead: string;
    manifestoBody: string;
    manifestoSignal: {
      from: string;
      connectorLabel: string;
      to: string;
    };
    policyKicker: string;
    policyTitle: string;
    policySignals: Signal[];
    visitKicker: string;
    visitTitle: string;
    openingNotice: string;
  };
  events: {
    kicker: string;
    title: string;
    intro: string;
    emptyTitle: string;
    emptyBody: string;
    instagramNote: string;
    collectionLabel: string;
  };
  policy: {
    kicker: string;
    title: string;
    intro: string;
    draftLabel: string;
    rules: Signal[];
    questionsTitle: string;
    questionsBody: string;
  };
  visit: {
    kicker: string;
    title: string;
    intro: string;
    locationLabel: string;
    practicalLabel: string;
    coordinatesLabel: string;
    openingTitle: string;
    openingBody: string;
    entryTitle: string;
    entryBody: string;
    mediaTitle: string;
    mediaBody: string;
    reservationsTitle: string;
    reservationsBody: string;
  };
  privacy: {
    kicker: string;
    title: string;
    intro: string;
    draftLabel: string;
    sections: Signal[];
  };
  notFound: {
    code: string;
    title: string;
    body: string;
    home: string;
  };
};

export const translations: Record<Locale, Dictionary> = {
  sq: {
    documentLang: 'sq-AL',
    localeName: 'Shqip',
    alternateLocaleName: 'English',
    seo: {
      home: {
        title: 'Frekuence Club — Muzikë elektronike underground në Tiranë',
        description:
          'Frekuence Club është një klub underground për techno dhe house në Kompleksi Fari, Tiranë. Human Hz. Vetëm 18+.',
      },
      events: {
        title: 'Evente — Frekuence Club, Tiranë',
        description:
          'Shiko eventet e ardhshme të Frekuence Club në Tiranë. Frekuenca e radhës do të shpallet së shpejti.',
      },
      policy: {
        title: 'Politika e hyrjes — Frekuence Club',
        description:
          'Rregullat e hyrjes dhe kodi i sjelljes në Frekuence Club: 18+, ID fizike, respekt, pëlqim dhe pa foto ose video.',
      },
      visit: {
        title: 'Na vizito — Frekuence Club, Kompleksi Fari',
        description:
          'Gjej Frekuence Club te Kompleksi Fari në Tiranë, me hartë, rregullin 18+ dhe informacion praktik për vizitën.',
      },
      privacy: {
        title: 'Privatësia e faqes — Frekuence Club',
        description:
          'Informacion mbi privatësinë për faqen statike të Frekuence Club, regjistrat teknikë të serverit dhe lidhjet e jashtme.',
      },
    },
    global: {
      skip: 'Kalo te përmbajtja',
      navigation: 'Navigimi kryesor',
      openMenu: 'Hap menunë',
      closeMenu: 'Mbyll menunë',
      nav: { events: 'Evente', policy: 'Politika', visit: 'Na vizito' },
      footerNavigation: 'Navigimi në fund të faqes',
      privacy: 'Privatësia',
      instagram: 'Frekuence Club në Instagram',
      languageSwitch: 'Shiko këtë faqe në anglisht',
      address: 'Kompleksi Fari, Tiranë',
      age: 'Vetëm 18+',
      copyright: 'Të gjitha të drejtat e rezervuara.',
    },
    common: {
      eyebrow: 'Frekuence Club / Tiranë',
      events: 'Shiko eventet',
      policy: 'Lexo politikën',
      visit: 'Planifiko vizitën',
      privacy: 'Privatësia',
      learnMore: 'Më shumë',
      directions: 'Hap në Google Maps',
      instagram: 'Hap Instagramin',
      reservationsStatus: 'Rezervimet — së shpejti',
      physicalId: 'Kërkohet dokument fizik identifikimi.',
      noMedia: 'Pa foto. Pa video.',
    },
    home: {
      heroKicker: 'Kompleksi Fari / Tiranë / 41.3084° N',
      heroTitle: 'Human Hz',
      heroLocation: 'Nën një far, në një bodrum.',
      heroCalibration: 'Club calibrated at 7.83 Hz',
      heroAge: '18+ / ID fizike',
      eventsKicker: 'Sinjali i ardhshëm',
      eventsTitle: 'Evente',
      eventsEmpty: 'Frekuenca e radhës do të shpallet së shpejti.',
      eventsNote: 'Njoftimet publikohen këtu dhe në kanalin tonë zyrtar në Instagram.',
      manifestoKicker: 'Human Hz / Manifest',
      manifestoTitle: 'Nuk hyjmë si një turmë.',
      manifestoLead:
        'Secili hyn si një frekuencë më vete. Brenda, valët takohen dhe dyshemeja bëhet një fushë e përbashkët.',
      manifestoBody:
        'Muzika përjetohet në trup, jo nga larg. Prania, lëvizja dhe energjia kolektive vlejnë më shumë se performanca apo dokumentimi i natës.',
      manifestoSignal: {
        from: 'Individual frequency',
        connectorLabel: 'drejt',
        to: 'shared field',
      },
      policyKicker: 'Hapësirë e përbashkët',
      policyTitle: 'Rregulla të qarta. Prani e lirë.',
      policySignals: [
        {
          title: '18+ / ID fizike',
          body: 'Hyrja lejohet vetëm për persona mbi 18 vjeç me dokument fizik identifikimi.',
        },
        {
          title: 'Respekt dhe pëlqim',
          body: 'Respekto kufijtë, hapësirën dhe pëlqimin e çdo personi.',
        },
        {
          title: 'Zero tolerancë',
          body: 'Nuk tolerohen diskriminimi, ngacmimi, dhuna, kërcënimi ose sjellja agresive.',
        },
        {
          title: 'Pa foto. Pa video.',
          body: 'Nata përjetohet këtu. Telefonat dhe kamerat nuk janë pjesë e pistës.',
        },
      ],
      visitKicker: 'Vendndodhja',
      visitTitle: 'Kompleksi Fari, Tiranë',
      openingNotice: 'Orari publikohet për çdo event.',
    },
    events: {
      kicker: 'Programi / Europe–Tirane',
      title: 'Evente',
      intro: 'Çdo event publikohet me orarin dhe informacionin e hyrjes sapo të jetë konfirmuar.',
      emptyTitle: 'Frekuenca e radhës do të shpallet së shpejti.',
      emptyBody:
        'Nuk ka evente të publikuara aktualisht. Ndiq kanalin zyrtar për sinjalin e ardhshëm.',
      instagramNote: 'Instagrami është kanal njoftimi, jo kanal rezervimi.',
      collectionLabel: 'Eventet e publikuara',
    },
    policy: {
      kicker: 'Hyrja / Kodi i sjelljes',
      title: 'Politika e klubit',
      intro:
        'Këto rregulla mbrojnë sigurinë, respektin dhe atmosferën e përbashkët brenda Frekuence Club.',
      draftLabel: 'Draft për miratim nga pronari para publikimit',
      rules: [
        {
          title: '01 / Mosha dhe identifikimi',
          body: 'Hyrja është rreptësisht 18+. Kërkohet dokument fizik, i vlefshëm identifikimi. Fotografitë ose kopjet digjitale nuk mjaftojnë.',
        },
        {
          title: '02 / Vendimi në derë',
          body: 'Hyrja i nënshtrohet vendimit të ekipit të derës dhe nuk garantohet. Hyrja mund të refuzohet kur stafi vlerëson në mënyrë të arsyeshme se sjellja e një vizitori mund të cenojë sigurinë, respektin ose atmosferën e ambientit.',
        },
        {
          title: '03 / Lista dhe rezervimet',
          body: 'Një rezervim ose regjistrim në listën e të ftuarve nuk garanton hyrjen. Rezervimet nuk janë ende të disponueshme në Fazën 1.',
        },
        {
          title: '04 / Pagesa e hyrjes',
          body: 'Sipas procesit aktual, pagesa e hyrjes kryhet vetëm pasi hyrja të jetë miratuar nga ekipi i derës.',
        },
        {
          title: '05 / Respekti dhe pëlqimi',
          body: 'Respekto kufijtë personalë, pëlqimin dhe hapësirën e përbashkët. Kushtoji vëmendje ndikimit të sjelljes sate te të tjerët.',
        },
        {
          title: '06 / Zero tolerancë',
          body: 'Diskriminimi, ngacmimi, dhuna, kërcënimi, frikësimi dhe sjellja agresive nuk tolerohen.',
        },
        {
          title: '07 / Pa fotografi ose video',
          body: 'Fotografimi dhe regjistrimi i videove nuk lejohen. Kjo mbron privatësinë dhe praninë e të gjithëve në hapësirë.',
        },
        {
          title: '08 / Udhëzimet e stafit',
          body: 'Vizitorët duhet të ndjekin udhëzimet e stafit. Shkelja e rregullave mund të sjellë largimin nga ambienti.',
        },
      ],
      questionsTitle: 'Pyetje mbi politikën ose aksesueshmërinë',
      questionsBody:
        'Një kanal zyrtar kontakti do të publikohet sapo të konfirmohet. Deri atëherë, nuk shfaqim adresa ose numra të pakonfirmuar.',
    },
    visit: {
      kicker: '41.3083996 / 19.814106',
      title: 'Na vizito',
      intro:
        'Frekuence Club ndodhet te Kompleksi Fari në Tiranë. Orari dhe hyrja komunikohen veçmas për çdo event.',
      locationLabel: 'Vendndodhja',
      practicalLabel: 'Para se të vish',
      coordinatesLabel: 'Koordinatat',
      openingTitle: 'Orari',
      openingBody: 'Orari publikohet për çdo event.',
      entryTitle: 'Hyrja',
      entryBody: 'Vetëm 18+. Kërkohet dokument fizik identifikimi.',
      mediaTitle: 'Në pistë',
      mediaBody: 'Pa foto. Pa video. Respekto hapësirën dhe njerëzit rreth teje.',
      reservationsTitle: 'Rezervimet',
      reservationsBody: 'Rezervimet nuk janë të disponueshme aktualisht.',
    },
    privacy: {
      kicker: 'Faqja / Të dhënat',
      title: 'Privatësia',
      intro:
        'Kjo faqe statike nuk ka formularë, llogari, analitikë, harta të integruara, feed social ose cookie jo-thelbësore.',
      draftLabel: 'Draft ligjor — të dhënat e operatorit dhe hostimit mbeten për miratim',
      sections: [
        {
          title: '01 / Çfarë përpunohet',
          body: 'Vetë faqja nuk mbledh të dhëna përmes formularëve. Serveri web mund të krijojë regjistra teknikë standardë, si adresa IP, koha e kërkesës, URL-ja, kodi i përgjigjes, referuesi dhe user-agent. Fushat e sakta duhet të konfirmohen nga operatori i hostimit para publikimit.',
        },
        {
          title: '02 / Qëllimi dhe ruajtja',
          body: 'Regjistrat teknikë mund të përdoren për siguri, diagnostikim dhe funksionim të shërbimit. Baza ligjore, marrësit dhe periudha e ruajtjes nuk janë konfirmuar ende dhe duhet të miratohen para lançimit.',
        },
        {
          title: '03 / Cookie dhe gjurmim',
          body: 'Faza 1 nuk përdor cookie jo-thelbësore, piksel marketingu ose gjurmim sjelljeje. Për këtë arsye nuk shfaqet banner pëlqimi.',
        },
        {
          title: '04 / Lidhjet e jashtme',
          body: 'Kur hap Google Maps ose Instagram, largohesh nga frekuence.club. Përpunimi i mëtejshëm rregullohet nga politikat e privatësisë së atij shërbimi të tretë.',
        },
        {
          title: '05 / Operatori dhe të drejtat',
          body: 'Identiteti ligjor i operatorit, kontakti për kërkesat e privatësisë dhe procesi për ushtrimin e të drejtave duhet të jepen dhe miratohen para publikimit. Nuk publikojmë të dhëna të sajuara.',
        },
      ],
    },
    notFound: {
      code: '404 / Sinjal i humbur',
      title: 'Kjo frekuencë nuk u gjet.',
      body: 'Adresa mund të ketë ndryshuar ose të mos ekzistojë.',
      home: 'Kthehu në hyrje',
    },
  },
  en: {
    documentLang: 'en',
    localeName: 'English',
    alternateLocaleName: 'Shqip',
    seo: {
      home: {
        title: 'Frekuence Club — Underground techno and house in Tirana',
        description:
          'Frekuence Club is an underground techno and house club at Kompleksi Fari in Tirana, Albania. Human Hz. Strictly 18+.',
      },
      events: {
        title: 'Events — Frekuence Club, Tirana',
        description:
          'See upcoming events at Frekuence Club in Tirana. The next frequency will be announced soon.',
      },
      policy: {
        title: 'Entry policy — Frekuence Club',
        description:
          'Frekuence Club entry policy and code of conduct: 18+, physical ID, respect, consent, and no photos or videos.',
      },
      visit: {
        title: 'Visit — Frekuence Club at Kompleksi Fari, Tirana',
        description:
          'Find Frekuence Club at Kompleksi Fari in Tirana, with directions, the 18+ rule, and practical visit information.',
      },
      privacy: {
        title: 'Website privacy — Frekuence Club',
        description:
          'Privacy information for the static Frekuence Club website, ordinary technical server logs, and external links.',
      },
    },
    global: {
      skip: 'Skip to content',
      navigation: 'Primary navigation',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
      nav: { events: 'Events', policy: 'Policy', visit: 'Visit' },
      footerNavigation: 'Footer navigation',
      privacy: 'Privacy',
      instagram: 'Frekuence Club on Instagram',
      languageSwitch: 'View this page in Albanian',
      address: 'Kompleksi Fari, Tirana',
      age: 'Strictly 18+',
      copyright: 'All rights reserved.',
    },
    common: {
      eyebrow: 'Frekuence Club / Tirana',
      events: 'View events',
      policy: 'Read the policy',
      visit: 'Plan your visit',
      privacy: 'Privacy',
      learnMore: 'Learn more',
      directions: 'Open in Google Maps',
      instagram: 'Open Instagram',
      reservationsStatus: 'Reservations — coming soon',
      physicalId: 'A physical identity document is required.',
      noMedia: 'No photos. No videos.',
    },
    home: {
      heroKicker: 'Kompleksi Fari / Tirana / 41.3084° N',
      heroTitle: 'Human Hz',
      heroLocation: 'Under a lighthouse, in a basement.',
      heroCalibration: 'Club calibrated at 7.83 Hz',
      heroAge: '18+ / Physical ID',
      eventsKicker: 'Next signal',
      eventsTitle: 'Events',
      eventsEmpty: 'The next frequency will be announced soon.',
      eventsNote: 'Announcements are published here and on our official Instagram channel.',
      manifestoKicker: 'Human Hz / Manifesto',
      manifestoTitle: 'We do not enter as a crowd.',
      manifestoLead:
        'Each person enters as a frequency of their own. Inside, the waves meet and the dance floor becomes a shared field.',
      manifestoBody:
        'Music is experienced through the body, not from a distance. Presence, movement, and collective energy matter more than performance or documenting the night.',
      manifestoSignal: {
        from: 'Individual frequency',
        connectorLabel: 'to',
        to: 'shared field',
      },
      policyKicker: 'Shared space',
      policyTitle: 'Clear rules. Free presence.',
      policySignals: [
        {
          title: '18+ / Physical ID',
          body: 'Admission is strictly for guests aged 18 or over with a physical identity document.',
        },
        {
          title: 'Respect and consent',
          body: 'Respect every person’s boundaries, space, and consent.',
        },
        {
          title: 'Zero tolerance',
          body: 'Discrimination, harassment, violence, intimidation, and aggressive conduct are not tolerated.',
        },
        {
          title: 'No photos. No videos.',
          body: 'The night is experienced here. Phones and cameras are not part of the dance floor.',
        },
      ],
      visitKicker: 'Location',
      visitTitle: 'Kompleksi Fari, Tirana',
      openingNotice: 'Opening times are published for each event.',
    },
    events: {
      kicker: 'Programme / Europe–Tirane',
      title: 'Events',
      intro: 'Each event is published with its schedule and entry information once confirmed.',
      emptyTitle: 'The next frequency will be announced soon.',
      emptyBody:
        'There are no published events right now. Follow the official channel for the next signal.',
      instagramNote: 'Instagram is an announcement channel, not a reservation channel.',
      collectionLabel: 'Published events',
    },
    policy: {
      kicker: 'Entry / Code of conduct',
      title: 'Club policy',
      intro:
        'These rules protect safety, respect, and the shared atmosphere inside Frekuence Club.',
      draftLabel: 'Draft pending owner approval before publication',
      rules: [
        {
          title: '01 / Age and identification',
          body: 'Admission is strictly 18+. A valid physical identity document is required. Photographs or digital copies are not sufficient.',
        },
        {
          title: '02 / Door decision',
          body: "Entry is subject to the door team's discretion and is not guaranteed. Entry may be declined when staff reasonably believe that a guest's conduct could compromise the safety, respect, or atmosphere of the venue.",
        },
        {
          title: '03 / Lists and reservations',
          body: 'A reservation or guest-list registration does not guarantee admission. Reservations are not yet available in Phase 1.',
        },
        {
          title: '04 / Entry payment',
          body: 'Under the current process, entry payment takes place only after admission has been approved by the door team.',
        },
        {
          title: '05 / Respect and consent',
          body: 'Respect personal boundaries, consent, and the shared space. Stay aware of how your conduct affects others.',
        },
        {
          title: '06 / Zero tolerance',
          body: 'Discrimination, harassment, violence, intimidation, threats, and aggressive conduct are not tolerated.',
        },
        {
          title: '07 / No photography or video',
          body: 'Photography and video recording are not permitted. This protects everyone’s privacy and presence in the space.',
        },
        {
          title: '08 / Staff instructions',
          body: 'Guests must follow staff instructions. Breaking these rules may result in removal from the venue.',
        },
      ],
      questionsTitle: 'Policy or accessibility questions',
      questionsBody:
        'An official contact route will be published once confirmed. Until then, we do not display unverified addresses or numbers.',
    },
    visit: {
      kicker: '41.3083996 / 19.814106',
      title: 'Visit',
      intro:
        'Frekuence Club is at Kompleksi Fari in Tirana. Opening times and entry details are communicated for each event.',
      locationLabel: 'Location',
      practicalLabel: 'Before you arrive',
      coordinatesLabel: 'Coordinates',
      openingTitle: 'Opening times',
      openingBody: 'Opening times are published for each event.',
      entryTitle: 'Admission',
      entryBody: 'Strictly 18+. A physical identity document is required.',
      mediaTitle: 'On the dance floor',
      mediaBody: 'No photos. No videos. Respect the space and the people around you.',
      reservationsTitle: 'Reservations',
      reservationsBody: 'Reservations are not currently available.',
    },
    privacy: {
      kicker: 'Website / Data',
      title: 'Privacy',
      intro:
        'This static site has no forms, accounts, analytics, embedded maps, social feeds, or non-essential cookies.',
      draftLabel: 'Legal draft — operator and hosting details remain pending approval',
      sections: [
        {
          title: '01 / What is processed',
          body: 'The website itself does not collect data through forms. The web server may create ordinary technical logs such as IP address, request time, URL, response status, referrer, and user agent. The exact fields must be confirmed with the hosting operator before publication.',
        },
        {
          title: '02 / Purpose and retention',
          body: 'Technical logs may be used for security, diagnosis, and service operation. The legal basis, recipients, and retention period are not yet confirmed and must be approved before launch.',
        },
        {
          title: '03 / Cookies and tracking',
          body: 'Phase 1 does not use non-essential cookies, marketing pixels, or behavioral tracking. For that reason, no consent banner is displayed.',
        },
        {
          title: '04 / External links',
          body: 'When you open Google Maps or Instagram, you leave frekuence.club. Any further processing is governed by that third party’s privacy terms.',
        },
        {
          title: '05 / Operator and rights',
          body: 'The legal identity of the operator, privacy-request contact, and process for exercising user rights must be supplied and approved before publication. We do not publish invented details.',
        },
      ],
    },
    notFound: {
      code: '404 / Signal lost',
      title: 'This frequency was not found.',
      body: 'The address may have moved or may not exist.',
      home: 'Return to the entrance',
    },
  },
};

export function t(locale: Locale): Dictionary {
  return translations[locale];
}
