import { useTheme } from '../theme';

export default function ThemeSwitcher() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center w-8 h-8 border border-border rounded-[6px] bg-surface-2 text-muted cursor-pointer transition-colors duration-150 hover:text-accent hover:border-accent-dim text-[0.95rem]"
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? '☀' : '🌙'}
    </button>
  );
}
