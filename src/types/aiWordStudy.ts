export interface OriginalWord {
  word: string;
  transliteration: string;
  pronunciation: string;
  strongsNumber?: string;
  literalMeaning: string;
  language: 'hebrew' | 'greek';
}

export interface CrossReference {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  bookId: string;
}

export interface RelatedTopic {
  topic: string;
  description: string;
}

export interface RelatedSermon {
  id: string;
  title: string;
  verse?: string;
}

export interface RelatedDevotion {
  id: string;
  title: string;
  verse?: string;
}

export interface AIWordStudyResponse {
  word: string;
  context: {
    book: string;
    chapter: number;
    verse: number;
    translation: string;
    fullVerse: string;
  };
  meaning: string;
  biblicalDefinition: string;
  originalWord?: OriginalWord;
  contextInScripture: string;
  crossReferences: CrossReference[];
  simpleExplanation: string;
  modernDayApplication: string;
  relatedTopics: RelatedTopic[];
  relatedSermons: RelatedSermon[];
  relatedDevotions: RelatedDevotion[];
  timestamp: number;
}

export interface AIWordStudyCache {
  [key: string]: {
    response: AIWordStudyResponse;
    timestamp: number;
  };
}

export interface AIWordStudyHistory {
  id: string;
  word: string;
  context: {
    book: string;
    chapter: number;
    verse: number;
    translation: string;
  };
  timestamp: number;
  isBookmarked: boolean;
}

export interface AIWordStudyRequest {
  word: string;
  book: string;
  chapter: number;
  verse: number;
  translation: string;
  fullVerse?: string;
}
