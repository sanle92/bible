import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePreferencesStore } from '@/stores/preferencesStore';
import {
  Plus,
  Trash2,
  Search,
  Star,
  Copy,
  FileDown,
  Mic,
  FileText,
  X,
  Paperclip,
  Calendar,
  User,
  MapPin,
  Church,
  BookOpen,
  Tag,
  ArrowLeft,
  BookMarked,
} from 'lucide-react';
import { useSermonsStore } from '@/stores/sermonsStore';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/useToast';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { ThemePicker } from '@/components/themes/ThemePicker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { format } from 'date-fns';
import { cn } from '@/utils/cn';
import type { Sermon, SermonAttachment } from '@/types/sermons';

export function SermonsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    sermons,
    loaded,
    loadAll,
    upsertSermon,
    deleteSermon,
    toggleFavorite,
    duplicateSermon,
    searchSermons,
  } = useSermonsStore();
  const { user } = useAuthStore();
  const { readingPosition } = usePreferencesStore();
  const { showToast } = useToast();
  const userId = user?.id ?? 'local-user';

  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const referencedVerse = searchParams.get('verse');

  useEffect(() => {
    if (!loaded) void loadAll();
  }, [loaded, loadAll]);

  useEffect(() => {
    const activeSermonId = searchParams.get('active');
    if (activeSermonId && loaded) {
      setActiveId(activeSermonId);
      setMobileEditorOpen(true);
    }
  }, [searchParams, loaded]);

  const active = sermons.find((s) => s.id === activeId);
  const results = useMemo(() => searchSermons(query), [searchSermons, query, sermons]);

  const handleNew = async () => {
    const sermon = await upsertSermon({
      userId,
      title: 'New Sermon',
      content: '',
      tags: [],
      date: new Date().toISOString().slice(0, 10),
    });
    setActiveId(sermon.id);
    setMobileEditorOpen(true);
  };

  const handleSermonSelect = (sermonId: string) => {
    setActiveId(sermonId);
    setMobileEditorOpen(true);
  };

  const handleReturnToReading = () => {
    if (readingPosition) {
      navigate(`/read?book=${readingPosition.bookId}&chapter=${readingPosition.chapter}&verse=${readingPosition.verse ?? ''}`);
    } else {
      navigate('/read');
    }
  };

  const update = async (updates: Partial<Sermon>) => {
    if (!active) return;
    await upsertSermon({ ...active, ...updates });
  };

  const handlePdfExport = () => {
    if (!active) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${active.title}</title>
          <style>
            body { font-family: system-ui, sans-serif; line-height: 1.6; padding: 2rem; color: #1c1c1e; }
            h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
            .meta { color: #6b6b6b; margin-bottom: 1.5rem; }
            h2 { font-size: 1.1rem; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #9333ea; }
            .field { margin-bottom: 1rem; }
            .label { font-weight: 600; font-size: 0.85rem; text-transform: uppercase; color: #6b6b6b; }
          </style>
        </head>
        <body>
          <h1>${active.title}</h1>
          <p class="meta">${[active.speaker, active.church, active.location, active.date].filter(Boolean).join(' • ')}</p>
          ${fieldHtml('Theme', active.theme)}
          ${fieldHtml('Main Verse', active.mainVerse)}
          ${fieldHtml('Supporting Verses', active.supportingVerses?.join(', '))}
          ${fieldHtml('Outline', active.outline)}
          ${fieldHtml('Notes', active.notes)}
          ${fieldHtml('Application', active.application)}
          ${fieldHtml('Prayer', active.prayer)}
          ${fieldHtml('Tags', active.tags?.join(', '))}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
    showToast('Print / PDF dialog opened', 'success');
  };

  const handleDuplicate = async () => {
    if (!active) return;
    const copy = await duplicateSermon(active.id);
    setActiveId(copy.id);
    showToast('Sermon duplicated', 'success');
  };

  const handleDelete = async () => {
    if (!active) return;
    await deleteSermon(active.id);
    setActiveId(null);
    showToast('Sermon deleted', 'success');
  };

  const toggleRecording = async () => {
    if (recording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          const attachment: SermonAttachment = {
            id: crypto.randomUUID(),
            type: 'audio',
            name: `Recording ${format(new Date(), 'yyyy-MM-dd HH:mm')}.webm`,
            dataUrl: reader.result as string,
            createdAt: new Date().toISOString(),
          };
          void update({ attachments: [...(active?.attachments ?? []), attachment] });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      showToast('Microphone not available', 'error');
    }
  };

  const handleFileUpload = async (file: File) => {
    const type: SermonAttachment['type'] = file.type.startsWith('audio/') ? 'audio' : file.type === 'application/pdf' ? 'pdf' : 'image';
    const reader = new FileReader();
    reader.onload = () => {
      const attachment: SermonAttachment = {
        id: crypto.randomUUID(),
        type,
        name: file.name,
        dataUrl: reader.result as string,
        createdAt: new Date().toISOString(),
      };
      void update({ attachments: [...(active?.attachments ?? []), attachment] });
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = (id: string) => {
    if (!active) return;
    void update({ attachments: active.attachments?.filter((a) => a.id !== id) ?? [] });
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Sermons</h1>
        <Button onClick={() => void handleNew()}>
          <Plus size={16} /> New Sermon
        </Button>
      </div>

      {!active && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 flex items-center gap-2 rounded-lg bg-[var(--bg-hover)] px-3 py-2 max-w-md">
              <Search size={16} className="text-[var(--text-tertiary)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sermons..."
                className="bg-transparent outline-none text-sm w-full placeholder:text-[var(--text-tertiary)]"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.length === 0 && (
              <p className="text-sm text-[var(--text-tertiary)] col-span-full text-center py-10">
                {query ? 'No sermons match.' : 'No sermons yet. Create one to start organizing your teaching notes.'}
              </p>
            )}
            {results
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((sermon) => (
                <Card
                  key={sermon.id}
                  className={cn('p-4 cursor-pointer hover:border-[var(--accent)] transition-colors relative group')}
                  onClick={() => handleSermonSelect(sermon.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-[var(--text-primary)] truncate">{sermon.title}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void toggleFavorite(sermon.id);
                      }}
                      className={cn('shrink-0', sermon.isFavorite ? 'text-yellow-500' : 'text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100')}
                    >
                      <Star size={16} fill={sermon.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  {sermon.speaker && <p className="text-xs text-[var(--text-secondary)] mt-1">{sermon.speaker}</p>}
                  {sermon.theme && <p className="text-xs text-[var(--text-tertiary)] mt-1 truncate">{sermon.theme}</p>}
                  {sermon.mainVerse && (
                    <p className="text-xs text-[var(--accent)] mt-1 truncate">{sermon.mainVerse}</p>
                  )}
                  <p className="text-xs text-[var(--text-tertiary)] mt-2">{format(new Date(sermon.date), 'MMM d, yyyy')}</p>
                </Card>
              ))}
          </div>
        </div>
      )}

      {active && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden md:flex flex-col gap-4 flex-1 min-h-0 overflow-hidden"
        >
          <div className="flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="self-start" onClick={() => setActiveId(null)}>
                ← Back to sermons
              </Button>
              {readingPosition && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReturnToReading}
                  className="gap-1 text-[var(--accent)]"
                >
                  <BookMarked size={14} />
                  Return to Reading
                </Button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <IconButton
                onClick={() => void toggleFavorite(active.id)}
                className={active.isFavorite ? 'text-yellow-500' : 'text-[var(--text-tertiary)]'}
                aria-label="Favorite"
              >
                <Star size={18} fill={active.isFavorite ? 'currentColor' : 'none'} />
              </IconButton>
              <IconButton onClick={() => void handleDuplicate()} aria-label="Duplicate">
                <Copy size={18} />
              </IconButton>
              <IconButton onClick={() => void handlePdfExport()} aria-label="Export PDF">
                <FileDown size={18} />
              </IconButton>
              <IconButton onClick={() => void handleDelete()} className="text-red-500" aria-label="Delete">
                <Trash2 size={18} />
              </IconButton>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {referencedVerse && (
              <div className="mb-4 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/20 p-3">
                <div className="flex items-center gap-2 text-[var(--accent)]">
                  <BookMarked size={16} />
                  <span className="text-sm font-semibold">Referenced Verse</span>
                </div>
                <p className="mt-1 text-sm text-[var(--text-primary)]">{referencedVerse}</p>
              </div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <input
                value={active.title}
                onChange={(e) => void update({ title: e.target.value })}
                className="flex-1 text-2xl font-bold bg-transparent outline-none text-[var(--text-primary)]"
                placeholder="Sermon title"
              />
              <ThemePicker
                selectedIds={active.themeIds ?? []}
                onChange={(ids) => void update({ themeIds: ids })}
                className="w-56"
              />
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <Field icon={User} label="Speaker" value={active.speaker ?? ''} onChange={(v) => void update({ speaker: v })} />
              <Field icon={Church} label="Church" value={active.church ?? ''} onChange={(v) => void update({ church: v })} />
              <Field icon={MapPin} label="Location" value={active.location ?? ''} onChange={(v) => void update({ location: v })} />
              <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-2">
                <Calendar size={14} className="text-[var(--text-tertiary)]" />
                <input
                  type="date"
                  value={active.date}
                  onChange={(e) => void update({ date: e.target.value })}
                  className="bg-transparent outline-none text-sm w-full text-[var(--text-primary)]"
                />
              </div>
              <Field icon={BookOpen} label="Theme" value={active.theme ?? ''} onChange={(v) => void update({ theme: v })} />
              <Field icon={BookOpen} label="Main Verse" value={active.mainVerse ?? ''} onChange={(v) => void update({ mainVerse: v })} />
              <div className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-2">
                <Tag size={14} className="text-[var(--text-tertiary)]" />
                <input
                  value={active.tags?.join(', ') ?? ''}
                  onChange={(e) => void update({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
                  placeholder="Tags (comma separated)"
                  className="bg-transparent outline-none text-sm w-full text-[var(--text-primary)]"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-2">
                <BookOpen size={14} className="text-[var(--text-tertiary)]" />
                <input
                  value={active.supportingVerses?.join(', ') ?? ''}
                  onChange={(e) => void update({ supportingVerses: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
                  placeholder="Supporting verses (comma separated)"
                  className="bg-transparent outline-none text-sm w-full text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <EditorBlock label="Outline" content={active.outline ?? ''} onChange={(html) => void update({ outline: html })} />
              <EditorBlock label="Notes" content={active.notes ?? ''} onChange={(html) => void update({ notes: html })} />
              <EditorBlock label="Application" content={active.application ?? ''} onChange={(html) => void update({ application: html })} />
              <EditorBlock label="Prayer" content={active.prayer ?? ''} onChange={(html) => void update({ prayer: html })} />
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm text-[var(--text-primary)]">Attachments</h3>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                  <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1">
                    <Paperclip size={14} /> Add File
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void toggleRecording()}
                    className={cn('gap-1', recording && 'bg-red-500/10 text-red-500')}
                  >
                    <Mic size={14} /> {recording ? 'Stop' : 'Record'}
                  </Button>
                </div>
              </div>
              {active.attachments && active.attachments.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {active.attachments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-2 py-1 text-xs text-[var(--text-secondary)]"
                    >
                      {a.type === 'audio' ? <Mic size={12} /> : a.type === 'pdf' ? <FileText size={12} /> : <Paperclip size={12} />}
                      <span className="truncate max-w-[160px]">{a.name}</span>
                      <button onClick={() => removeAttachment(a.id)} className="hover:text-red-500">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-tertiary)]">No attachments yet.</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Mobile Editor Overlay */}
      <AnimatePresence>
        {mobileEditorOpen && active && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileEditorOpen(false)}
              className="md:hidden fixed inset-0 z-50 bg-black/50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="md:hidden fixed inset-x-0 bottom-0 z-50 h-[90vh] bg-[var(--bg-surface)] rounded-t-3xl border-t border-[var(--border-subtle)] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMobileEditorOpen(false)}
                    className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  {readingPosition && (
                    <button
                      onClick={handleReturnToReading}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-medium"
                    >
                      <BookMarked size={14} />
                      Return to Reading
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <IconButton
                    onClick={() => void toggleFavorite(active.id)}
                    className={active.isFavorite ? 'text-yellow-500' : 'text-[var(--text-tertiary)]'}
                    aria-label="Favorite"
                  >
                    <Star size={18} fill={active.isFavorite ? 'currentColor' : 'none'} />
                  </IconButton>
                  <IconButton onClick={() => void handleDelete().then(() => { setActiveId(null); setMobileEditorOpen(false); })} className="text-red-500" aria-label="Delete">
                    <Trash2 size={18} />
                  </IconButton>
                </div>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4">
                  {referencedVerse && (
                    <div className="mb-4 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/20 p-3">
                      <div className="flex items-center gap-2 text-[var(--accent)]">
                        <BookMarked size={16} />
                        <span className="text-sm font-semibold">Referenced Verse</span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--text-primary)]">{referencedVerse}</p>
                    </div>
                  )}
                  <input
                    value={active.title}
                    onChange={(e) => void update({ title: e.target.value })}
                    className="w-full text-xl font-bold bg-transparent outline-none text-[var(--text-primary)] mb-4"
                    placeholder="Sermon title"
                  />

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <Field icon={User} label="Speaker" value={active.speaker ?? ''} onChange={(v) => void update({ speaker: v })} />
                    <Field icon={Church} label="Church" value={active.church ?? ''} onChange={(v) => void update({ church: v })} />
                    <Field icon={MapPin} label="Location" value={active.location ?? ''} onChange={(v) => void update({ location: v })} />
                    <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-2">
                      <Calendar size={14} className="text-[var(--text-tertiary)]" />
                      <input
                        type="date"
                        value={active.date}
                        onChange={(e) => void update({ date: e.target.value })}
                        className="bg-transparent outline-none text-sm w-full text-[var(--text-primary)]"
                      />
                    </div>
                    <Field icon={BookOpen} label="Theme" value={active.theme ?? ''} onChange={(v) => void update({ theme: v })} />
                    <Field icon={BookOpen} label="Main Verse" value={active.mainVerse ?? ''} onChange={(v) => void update({ mainVerse: v })} />
                  </div>

                  <div className="space-y-4 mb-4">
                    <EditorBlock label="Outline" content={active.outline ?? ''} onChange={(html) => void update({ outline: html })} />
                    <EditorBlock label="Notes" content={active.notes ?? ''} onChange={(html) => void update({ notes: html })} />
                    <EditorBlock label="Application" content={active.application ?? ''} onChange={(html) => void update({ application: html })} />
                    <EditorBlock label="Prayer" content={active.prayer ?? ''} onChange={(html) => void update({ prayer: html })} />
                  </div>

                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-sm text-[var(--text-primary)]">Attachments</h3>
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1">
                          <Paperclip size={14} /> Add File
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void toggleRecording()}
                          className={cn('gap-1', recording && 'bg-red-500/10 text-red-500')}
                        >
                          <Mic size={14} /> {recording ? 'Stop' : 'Record'}
                        </Button>
                      </div>
                    </div>
                    {active.attachments && active.attachments.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {active.attachments.map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-2 py-1 text-xs text-[var(--text-secondary)]"
                          >
                            {a.type === 'audio' ? <Mic size={12} /> : a.type === 'pdf' ? <FileText size={12} /> : <Paperclip size={12} />}
                            <span className="truncate max-w-[120px]">{a.name}</span>
                            <button onClick={() => removeAttachment(a.id)} className="hover:text-red-500">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-tertiary)]">No attachments yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] px-3 py-2">
      <Icon size={14} className="text-[var(--text-tertiary)]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        className="bg-transparent outline-none text-sm w-full text-[var(--text-primary)]"
      />
    </div>
  );
}

function EditorBlock({ label, content, onChange }: { label: string; content: string; onChange: (html: string) => void }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">{label}</h3>
      <RichTextEditor content={content} onChange={onChange} placeholder={`Write ${label.toLowerCase()}...`} className="min-h-[160px]" />
    </div>
  );
}

function fieldHtml(label: string, value?: string | null) {
  if (!value) return '';
  return `<div class="field"><div class="label">${label}</div><div>${value}</div></div>`;
}
