import { useI18n } from '../i18n';

const LANGS = ['en', 'uk'];

export default function LangSwitcher() {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="flex items-center border border-border rounded-[6px] overflow-hidden h-8">
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2.5 h-full text-[0.7rem] font-bold tracking-[0.06em] border-none cursor-pointer transition-colors duration-150 ${
            lang === l
              ? 'bg-accent text-black'
              : 'bg-surface-2 text-muted hover:text-text'
          }`}
        >
          {t(`lang.${l}`)}
        </button>
      ))}
    </div>
  );
}
