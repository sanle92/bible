import type { BibleTranslation } from '@/types/user';

export type TranslationLanguage = 'english' | 'french' | 'swahili' | 'lugbara' | 'other';

export interface TranslationMetadata {
  id: BibleTranslation;
  name: string;
  fullName: string;
  language: TranslationLanguage;
  languageCode: string;
  description: string;
  hasAudio: boolean;
  requiresDownload: boolean;
  license: string;
  offlineSize?: number; // in MB
}

export const TRANSLATIONS: Record<BibleTranslation, TranslationMetadata> = {
  kjv: {
    id: 'kjv',
    name: 'KJV',
    fullName: 'King James Version',
    language: 'english',
    languageCode: 'en',
    description: 'The classic King James Version, first published in 1611. Public domain.',
    hasAudio: true,
    requiresDownload: false,
    license: 'Public Domain',
  },
  web: {
    id: 'web',
    name: 'WEB',
    fullName: 'World English Bible',
    language: 'english',
    languageCode: 'en',
    description: 'A modern public domain translation based on the American Standard Version.',
    hasAudio: true,
    requiresDownload: false,
    license: 'Public Domain',
  },
  bbe: {
    id: 'bbe',
    name: 'BBE',
    fullName: 'Bible in Basic English',
    language: 'english',
    languageCode: 'en',
    description: 'A simplified English translation using only 1000 basic words.',
    hasAudio: true,
    requiresDownload: false,
    license: 'Public Domain',
  },
  asv: {
    id: 'asv',
    name: 'ASV',
    fullName: 'American Standard Version',
    language: 'english',
    languageCode: 'en',
    description: 'An American revision of the King James Version, published in 1901.',
    hasAudio: true,
    requiresDownload: false,
    license: 'Public Domain',
  },
  lsg: {
    id: 'lsg',
    name: 'LSG',
    fullName: 'Louis Segond 1910',
    language: 'french',
    languageCode: 'fr',
    description: 'The classic French Bible translation, widely used in French-speaking regions.',
    hasAudio: true,
    requiresDownload: true,
    license: 'Public Domain',
    offlineSize: 15,
  },
  ubs: {
    id: 'ubs',
    name: 'UBS',
    fullName: 'United Bible Societies',
    language: 'english',
    languageCode: 'en',
    description: 'Modern English translation from the United Bible Societies.',
    hasAudio: false,
    requiresDownload: true,
    license: 'Copyright - UBS',
    offlineSize: 12,
  },
  bhn: {
    id: 'bhn',
    name: 'BHN',
    fullName: 'Biblia Habari Njema',
    language: 'swahili',
    languageCode: 'sw',
    description: 'Popular Swahili Bible translation meaning "Good News Bible".',
    hasAudio: true,
    requiresDownload: true,
    license: 'Copyright - Bible Society',
    offlineSize: 18,
  },
  bst: {
    id: 'bst',
    name: 'BST',
    fullName: 'Bible Society of Tanzania',
    language: 'swahili',
    languageCode: 'sw',
    description: 'Official Swahili translation from the Bible Society of Tanzania.',
    hasAudio: true,
    requiresDownload: true,
    license: 'Copyright - Bible Society of Tanzania',
    offlineSize: 20,
  },
};

export const LANGUAGE_CATEGORIES: Record<TranslationLanguage, { label: string; flag: string }> = {
  english: { label: 'English', flag: '🇬🇧' },
  french: { label: 'French', flag: '🇫🇷' },
  swahili: { label: 'Swahili', flag: '🇹🇿' },
  lugbara: { label: 'Lugbara', flag: '🇺🇬' },
  other: { label: 'Other', flag: '🌍' },
};

export function getTranslationsByLanguage(language: TranslationLanguage): TranslationMetadata[] {
  return Object.values(TRANSLATIONS).filter(t => t.language === language);
}

export function getTranslationById(id: BibleTranslation): TranslationMetadata | undefined {
  return TRANSLATIONS[id];
}

export function getAllTranslations(): TranslationMetadata[] {
  return Object.values(TRANSLATIONS);
}

export function searchTranslations(query: string): TranslationMetadata[] {
  const q = query.toLowerCase();
  return Object.values(TRANSLATIONS).filter(t => 
    t.name.toLowerCase().includes(q) ||
    t.fullName.toLowerCase().includes(q) ||
    t.language.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q)
  );
}
