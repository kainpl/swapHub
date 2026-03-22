import { useEffect, useState } from 'react';
import { marked } from 'marked';
import { useI18n } from '../i18n';

const docs = import.meta.glob('../docs/setup-guide.*.md', { query: '?raw', import: 'default' });

export default function GuideModal({ open, onClose }) {
  const { lang } = useI18n();
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const key = `../docs/setup-guide.${lang}.md`;
    const loader = docs[key] || docs['../docs/setup-guide.en.md'];
    loader().then((md) => {
      setHtml(marked.parse(md));
      setLoading(false);
    });
  }, [open, lang]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-[14px] w-[90vw] max-w-[920px] max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-[1rem] font-bold text-text m-0">
            {lang === 'uk' ? 'Інструкція' : 'Setup Guide'}
          </h2>
          <button
            onClick={onClose}
            className="bg-transparent border border-border text-muted text-[0.8rem] w-8 h-8 rounded-[6px] cursor-pointer transition-all duration-150 hover:border-[#e55] hover:text-[#e55] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted">
              <span className="inline-block w-4 h-4 border-2 border-muted/30 border-t-muted rounded-full animate-spin mr-2" />
              Loading…
            </div>
          ) : (
            <div
              className="guide-content text-[0.85rem] text-text-dim leading-[1.7]"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
