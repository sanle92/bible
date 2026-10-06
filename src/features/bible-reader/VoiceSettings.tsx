import { useState, useEffect, useMemo } from 'react';
import { Play, Heart, HeartOff, Search, X, Volume2, RotateCcw, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { categorizeVoice, getAccentLabel, getGenderLabel, getStyleLabel, type VoiceAccent, type VoiceGender } from '@/utils/voiceCategories';
import { cn } from '@/utils/cn';

const PREVIEW_TEXT = 'In the beginning God created the heavens and the earth.';

interface VoiceSettingsProps {
  open: boolean;
  onClose: () => void;
  onVoiceChange?: (voiceName: string) => void;
  onPitchChange?: (pitch: number) => void;
}

export function VoiceSettings({ open, onClose, onVoiceChange, onPitchChange }: VoiceSettingsProps) {
  const { audioVoice, setAudioVoice, audioPitch, setAudioPitch, audioPlaybackSpeed, setAudioPlaybackSpeed, voiceFavorites, toggleVoiceFavorite } = usePreferencesStore();
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGender, setSelectedGender] = useState<VoiceGender | 'all'>('all');
  const [selectedAccent, setSelectedAccent] = useState<VoiceAccent | 'all'>('all');

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const categorizedVoices = useMemo(() => {
    return availableVoices.map((voice) => ({
      voice,
      category: categorizeVoice(voice.name, voice.lang),
    }));
  }, [availableVoices]);

  const filteredVoices = useMemo(() => {
    return categorizedVoices.filter(({ voice, category }) => {
      const matchesSearch = voice.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           voice.lang.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGender = selectedGender === 'all' || category.gender === selectedGender;
      const matchesAccent = selectedAccent === 'all' || category.accent === selectedAccent;
      return matchesSearch && matchesGender && matchesAccent;
    });
  }, [categorizedVoices, searchQuery, selectedGender, selectedAccent]);

  const accents = useMemo(() => {
    const uniqueAccents = new Set(categorizedVoices.map((v) => v.category.accent));
    return Array.from(uniqueAccents);
  }, [categorizedVoices]);

  const genders = useMemo(() => {
    const uniqueGenders = new Set(categorizedVoices.map((v) => v.category.gender));
    return Array.from(uniqueGenders);
  }, [categorizedVoices]);

  const handlePreview = (voice: SpeechSynthesisVoice) => {
    if (previewing) {
      window.speechSynthesis.cancel();
      setPreviewing(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(PREVIEW_TEXT);
    utterance.voice = voice;
    utterance.rate = audioPlaybackSpeed;
    utterance.pitch = audioPitch;

    utterance.onend = () => setPreviewing(false);
    utterance.onerror = () => setPreviewing(false);

    window.speechSynthesis.speak(utterance);
    setPreviewing(true);
  };

  const handleVoiceSelect = (voiceName: string) => {
    setAudioVoice(voiceName);
    onVoiceChange?.(voiceName);
  };

  const handleReset = () => {
    setAudioVoice('default');
    setAudioPitch(1.0);
    setAudioPlaybackSpeed(1.0);
  };

  const isFavorite = (voiceName: string) => voiceFavorites.includes(voiceName);

  const favoriteVoices = useMemo(() => {
    return categorizedVoices.filter(({ voice }) => voiceFavorites.includes(voice.name));
  }, [categorizedVoices, voiceFavorites]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[var(--bg-app)]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-[var(--bg-app)] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <ChevronDown size={24} />
              </button>
              <span className="text-sm font-medium text-[var(--text-tertiary)]">Voice Settings</span>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Voice Settings</h1>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <RotateCcw size={14} /> Reset to Default
                </button>
              </div>

              {/* Current Voice Info */}
              <div className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] mb-6">
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                  <Volume2 size={15} /> Current Voice
                </h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {audioVoice === 'default' ? 'System Default' : audioVoice}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      Speed: {audioPlaybackSpeed.toFixed(1)}x · Pitch: {audioPitch.toFixed(1)}
                    </p>
                  </div>
                  {audioVoice !== 'default' && (
                    <button
                      onClick={() => toggleVoiceFavorite(audioVoice)}
                      className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      {isFavorite(audioVoice) ? <Heart size={14} className="fill-red-500 text-red-500" /> : <HeartOff size={14} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Pitch & Speed Controls */}
              <div className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] mb-6">
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Voice Adjustments</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-[var(--text-tertiary)]">Speaking Speed</label>
                      <span className="text-xs text-[var(--text-secondary)]">{audioPlaybackSpeed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={audioPlaybackSpeed}
                      onChange={(e) => setAudioPlaybackSpeed(parseFloat(e.target.value))}
                      className="w-full accent-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-[var(--text-tertiary)]">Pitch</label>
                      <span className="text-xs text-[var(--text-secondary)]">{audioPitch.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={audioPitch}
                      onChange={(e) => {
                        const pitch = parseFloat(e.target.value);
                        setAudioPitch(pitch);
                        onPitchChange?.(pitch);
                      }}
                      className="w-full accent-[var(--accent)]"
                    />
                  </div>
                </div>
              </div>

              {/* Favorite Voices */}
              {favoriteVoices.length > 0 && (
                <div className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] mb-6">
                  <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                    <Heart size={15} className="text-red-500" /> Favorite Voices
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {favoriteVoices.map(({ voice, category }) => (
                      <button
                        key={voice.name}
                        onClick={() => handleVoiceSelect(voice.name)}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg border text-left transition-colors',
                          audioVoice === voice.name
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                            : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)]'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{voice.name}</p>
                          <p className="text-xs text-[var(--text-tertiary)]">{getAccentLabel(category.accent)}</p>
                        </div>
                        <Heart size={14} className="fill-red-500 text-red-500 flex-shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Voice Selection */}
              <div className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Available Voices</h2>

                {/* Search */}
                <div className="relative mb-4">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    type="text"
                    placeholder="Search voices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] pl-10 pr-10 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <select
                    value={selectedAccent}
                    onChange={(e) => setSelectedAccent(e.target.value as VoiceAccent | 'all')}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                  >
                    <option value="all">All Accents</option>
                    {accents.map((accent) => (
                      <option key={accent} value={accent}>{getAccentLabel(accent)}</option>
                    ))}
                  </select>
                  <select
                    value={selectedGender}
                    onChange={(e) => setSelectedGender(e.target.value as VoiceGender | 'all')}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                  >
                    <option value="all">All Genders</option>
                    {genders.map((gender) => (
                      <option key={gender} value={gender}>{getGenderLabel(gender)}</option>
                    ))}
                  </select>
                </div>

                {/* Voice List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredVoices.length === 0 ? (
                    <p className="text-sm text-[var(--text-tertiary)] text-center py-8">No voices match your search</p>
                  ) : (
                    filteredVoices.map(({ voice, category }) => (
                      <div
                        key={voice.name}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                          audioVoice === voice.name
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                            : 'border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]'
                        )}
                      >
                        <button
                          onClick={() => handleVoiceSelect(voice.name)}
                          className="flex-1 text-left"
                        >
                          <p className="text-sm font-medium text-[var(--text-primary)]">{voice.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-[var(--text-tertiary)]">{getAccentLabel(category.accent)}</span>
                            {category.gender !== 'neutral' && (
                              <span className="text-xs text-[var(--text-tertiary)]">· {getGenderLabel(category.gender)}</span>
                            )}
                            {category.style && (
                              <span className="text-xs text-[var(--text-tertiary)]">· {getStyleLabel(category.style)}</span>
                            )}
                          </div>
                        </button>
                        <button
                          onClick={() => handlePreview(voice)}
                          className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                          disabled={previewing}
                        >
                          <Play size={14} />
                        </button>
                        <button
                          onClick={() => toggleVoiceFavorite(voice.name)}
                          className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                        >
                          {isFavorite(voice.name) ? (
                            <Heart size={14} className="fill-red-500 text-red-500" />
                          ) : (
                            <HeartOff size={14} />
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
