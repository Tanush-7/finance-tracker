import { useState } from 'react';
import { QUICK_TAGS } from '../engine/seed';

interface Props {
  currentTag?: string;
  currentNote?: string;
  onSave: (tag: string, note: string) => void;
  onClear: () => void;
}

/** Inline "Why?" prompt: quick-tag chips + free-text note. Immediate, no modals. */
export default function TagPrompt({ currentTag, currentNote, onSave, onClear }: Props) {
  const [tag, setTag] = useState(currentTag ?? '');
  const [note, setNote] = useState(currentNote ?? '');
  const [custom, setCustom] = useState('');

  const save = () => {
    const finalTag = custom.trim() || tag;
    if (!finalTag) return;
    onSave(finalTag, note.trim());
  };

  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-sm font-semibold text-amber-900">
        Why? <span className="font-normal text-amber-700">Tag the reason so the spike makes sense later.</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUICK_TAGS.map((t) => (
          <button
            key={t}
            onClick={() => {
              setTag(t);
              setCustom('');
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              tag === t && !custom ? 'bg-amber-600 text-white' : 'bg-white text-amber-800 ring-1 ring-amber-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Or type your own tag"
          className="min-w-0 flex-1 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional)"
        className="mt-2 w-full rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={save}
          disabled={!tag && !custom.trim()}
          className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Save tag
        </button>
        {currentTag && (
          <button onClick={onClear} className="rounded-lg px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-100">
            Clear
          </button>
        )}
      </div>
      {currentTag && (
        <p className="mt-2 text-xs text-amber-700">
          Tagged: <span className="font-semibold">{currentTag}</span>
          {currentNote ? ` — ${currentNote}` : ''}
        </p>
      )}
    </div>
  );
}
