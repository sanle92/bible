import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';
import TurndownService from 'turndown';
import {
  Bold,
  Italic,
  UnderlineIcon,
  Highlighter,
  List,
  ListOrdered,
  Quote,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Table as TableIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  FileDown,
  Mic,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  onExportMarkdown?: (markdown: string) => void;
  onAudioReady?: (blob: Blob) => void;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  className,
  onExportMarkdown,
  onAudioReady,
}: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: placeholder ?? 'Start writing...' }),
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ allowBase64: true }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const handleExportMarkdown = () => {
    if (!editor || !onExportMarkdown) return;
    const turndown = new TurndownService({ headingStyle: 'atx' });
    onExportMarkdown(turndown.turndown(editor.getHTML()));
  };

  const handleImageUpload = async (file: File) => {
    if (!editor) return;
    const reader = new FileReader();
    reader.onload = () => {
      editor.chain().focus().setImage({ src: reader.result as string }).run();
    };
    reader.readAsDataURL(file);
  };

  const toggleRecording = async () => {
    if (!onAudioReady) return;
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
        onAudioReady(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      // microphone permission denied or unavailable
    }
  };

  if (!editor) return null;

  const buttonClass = (active: boolean) =>
    cn(
      'inline-flex items-center justify-center h-8 w-8 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
      active && 'bg-[var(--accent-soft)] text-[var(--accent)]'
    );

  const groupClass = 'w-px h-5 bg-[var(--border-subtle)] mx-1';

  return (
    <div className={cn('rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col', className)}>
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-[var(--border-subtle)]">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={buttonClass(editor.isActive('bold'))}>
          <Bold size={15} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={buttonClass(editor.isActive('italic'))}>
          <Italic size={15} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={buttonClass(editor.isActive('underline'))}>
          <UnderlineIcon size={15} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()} className={buttonClass(editor.isActive('highlight'))}>
          <Highlighter size={15} />
        </button>

        <span className={groupClass} />

        <button type="button" onClick={() => editor.chain().focus().setHeading({ level: 1 }).run()} className={buttonClass(editor.isActive('heading', { level: 1 }))}>
          <Heading1 size={15} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setHeading({ level: 2 }).run()} className={buttonClass(editor.isActive('heading', { level: 2 }))}>
          <Heading2 size={15} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setHeading({ level: 3 }).run()} className={buttonClass(editor.isActive('heading', { level: 3 }))}>
          <Heading3 size={15} />
        </button>

        <span className={groupClass} />

        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={buttonClass(editor.isActive('bulletList'))}>
          <List size={15} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={buttonClass(editor.isActive('orderedList'))}>
          <ListOrdered size={15} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} className={buttonClass(editor.isActive('taskList'))}>
          <CheckSquare size={15} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={buttonClass(editor.isActive('blockquote'))}>
          <Quote size={15} />
        </button>

        <span className={groupClass} />

        <button
          type="button"
          onClick={() => setShowLinkInput((s) => !s)}
          className={buttonClass(editor.isActive('link'))}
        >
          <LinkIcon size={15} />
        </button>
        <button type="button" onClick={() => setShowImageInput((s) => !s)} className={buttonClass(false)}>
          <ImageIcon size={15} />
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          className={buttonClass(false)}
        >
          <TableIcon size={15} />
        </button>

        <span className={groupClass} />

        <button type="button" onClick={() => editor.chain().focus().undo().run()} className={buttonClass(false)}>
          <Undo size={15} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} className={buttonClass(false)}>
          <Redo size={15} />
        </button>

        <span className={groupClass} />

        {onAudioReady && (
          <button
            type="button"
            onClick={toggleRecording}
            className={cn(
              'inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors',
              recording ? 'bg-red-500/10 text-red-500' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            )}
          >
            <Mic size={15} />
          </button>
        )}
        {onExportMarkdown && (
          <button type="button" onClick={handleExportMarkdown} className={buttonClass(false)}>
            <FileDown size={15} />
          </button>
        )}
      </div>

      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-hover)]">
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <button
            type="button"
            onClick={() => {
              if (linkUrl) editor.chain().focus().setLink({ href: linkUrl }).run();
              setLinkUrl('');
              setShowLinkInput(false);
            }}
            className="rounded-md bg-[var(--accent)] px-3 py-1 text-xs font-medium text-white"
          >
            Add
          </button>
        </div>
      )}

      {showImageInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-hover)]">
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL or choose file..."
            className="flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
              setShowImageInput(false);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]"
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => {
              if (imageUrl) editor.chain().focus().setImage({ src: imageUrl }).run();
              setImageUrl('');
              setShowImageInput(false);
            }}
            className="rounded-md bg-[var(--accent)] px-3 py-1 text-xs font-medium text-white"
          >
            Add
          </button>
        </div>
      )}

      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none flex-1 overflow-y-auto px-4 py-3 text-[var(--text-primary)] [&_.ProseMirror]:min-h-[160px] [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
