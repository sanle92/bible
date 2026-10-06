import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserPreferences, BibleTranslation } from '@/types/user';
import { DEFAULT_PREFERENCES } from '@/types/user';
import type { HighlightColor } from '@/utils/highlightColors';

interface PreferencesState {
  preferences: UserPreferences;
  setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  resetPreferences: () => void;
  lastViewedNote: string | null;
  setLastViewedNote: (noteId: string | null) => void;
  readingPosition: { bookId: string; chapter: number; verse?: number } | null;
  setReadingPosition: (position: { bookId: string; chapter: number; verse?: number } | null) => void;
  audioPlaybackSpeed: number;
  setAudioPlaybackSpeed: (speed: number) => void;
  audioVoice: string;
  setAudioVoice: (voice: string) => void;
  audioPitch: number;
  setAudioPitch: (pitch: number) => void;
  audioSleepTimer: number | null;
  setAudioSleepTimer: (minutes: number | null) => void;
  audioRepeatMode: 'none' | 'verse' | 'chapter' | 'book';
  setAudioRepeatMode: (mode: 'none' | 'verse' | 'chapter' | 'book') => void;
  audioReadingMode: 'verse' | 'chapter' | 'book';
  setAudioReadingMode: (mode: 'verse' | 'chapter' | 'book') => void;
  audioPosition: { bookId: string; chapter: number; verseIndex: number } | null;
  setAudioPosition: (position: { bookId: string; chapter: number; verseIndex: number } | null) => void;
  keepScreenAwake: boolean;
  setKeepScreenAwake: (enabled: boolean) => void;
  voiceFavorites: string[];
  setVoiceFavorites: (favorites: string[]) => void;
  toggleVoiceFavorite: (voiceName: string) => void;
  downloadedTranslations: BibleTranslation[];
  setDownloadedTranslations: (translations: BibleTranslation[]) => void;
  toggleDownloadedTranslation: (translation: BibleTranslation) => void;
  lastHighlightColor: HighlightColor;
  setLastHighlightColor: (color: HighlightColor) => void;
  recentHighlightColors: HighlightColor[];
  setRecentHighlightColors: (colors: HighlightColor[]) => void;
  addRecentHighlightColor: (color: HighlightColor) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      preferences: DEFAULT_PREFERENCES,
      setPreference: (key, value) =>
        set((s) => ({ preferences: { ...s.preferences, [key]: value } })),
      resetPreferences: () => set({ preferences: DEFAULT_PREFERENCES }),
      lastViewedNote: null,
      setLastViewedNote: (noteId) => set({ lastViewedNote: noteId }),
      readingPosition: null,
      setReadingPosition: (position) => set({ readingPosition: position }),
      audioPlaybackSpeed: 1.0,
      setAudioPlaybackSpeed: (speed) => set({ audioPlaybackSpeed: speed }),
      audioVoice: 'default',
      setAudioVoice: (voice) => set({ audioVoice: voice }),
      audioPitch: 1.0,
      setAudioPitch: (pitch) => set({ audioPitch: pitch }),
      audioSleepTimer: null,
      setAudioSleepTimer: (minutes) => set({ audioSleepTimer: minutes }),
      audioRepeatMode: 'none',
      setAudioRepeatMode: (mode) => set({ audioRepeatMode: mode }),
      audioReadingMode: 'chapter',
      setAudioReadingMode: (mode) => set({ audioReadingMode: mode }),
      audioPosition: null,
      setAudioPosition: (position) => set({ audioPosition: position }),
      keepScreenAwake: true,
      setKeepScreenAwake: (enabled) => set({ keepScreenAwake: enabled }),
      voiceFavorites: [],
      setVoiceFavorites: (favorites) => set({ voiceFavorites: favorites }),
      toggleVoiceFavorite: (voiceName) => {
        const favorites = get().voiceFavorites;
        if (favorites.includes(voiceName)) {
          set({ voiceFavorites: favorites.filter((v) => v !== voiceName) });
        } else {
          set({ voiceFavorites: [...favorites, voiceName] });
        }
      },
      downloadedTranslations: ['kjv', 'web', 'bbe', 'asv'], // Default translations are pre-downloaded
      setDownloadedTranslations: (translations) => set({ downloadedTranslations: translations }),
      toggleDownloadedTranslation: (translation) => {
        const downloaded = get().downloadedTranslations;
        if (downloaded.includes(translation)) {
          set({ downloadedTranslations: downloaded.filter((t) => t !== translation) });
        } else {
          set({ downloadedTranslations: [...downloaded, translation] });
        }
      },
      lastHighlightColor: 'yellow',
      setLastHighlightColor: (color) => set({ lastHighlightColor: color }),
      recentHighlightColors: ['yellow', 'green', 'blue'],
      setRecentHighlightColors: (colors) => set({ recentHighlightColors: colors }),
      addRecentHighlightColor: (color) => {
        const recent = get().recentHighlightColors;
        const filtered = recent.filter((c) => c !== color);
        set({ recentHighlightColors: [color, ...filtered].slice(0, 8) });
      },
    }),
    { name: 'bible-preferences-store' }
  )
);

export const FONT_SIZE_PX: Record<UserPreferences['fontSize'], string> = {
  sm: '15px',
  md: '17px',
  lg: '19px',
  xl: '22px',
};

export const LANGUAGE_LABELS: Record<UserPreferences['language'], string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  zh: '中文',
  ko: '한국어',
  sw: 'Kiswahili',
  lug: 'Lugbara',
};
