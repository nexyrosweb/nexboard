import { Check, ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { saveSettings } from '../api/settings';
import { useI18n } from '../context/I18nContext';
import { LOCALE_META, type Locale } from '../i18n/config';

/**
 * Compact language menu for the topbar.
 * Order in topbar: Language → Theme → Notifications
 */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonId = useId();
  const menuId = useId();
  const active = LOCALE_META.find((m) => m.value === locale) ?? LOCALE_META[0]!;

  const persist = useCallback(
    async (next: Locale) => {
      setLocale(next);
      setOpen(false);
      try {
        await saveSettings({ locale: next });
      } catch {
        /* local preference already saved; server sync is best-effort */
      }
    },
    [setLocale],
  );

  useEffect(() => {
    if (!open) return;

    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        (rootRef.current?.querySelector('button') as HTMLButtonElement | null)?.focus();
        return;
      }
      if (!listRef.current) return;
      const items = Array.from(
        listRef.current.querySelectorAll<HTMLButtonElement>('[role="option"]'),
      );
      const idx = items.indexOf(document.activeElement as HTMLButtonElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = items[Math.min(idx + 1, items.length - 1)] ?? items[0];
        next?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = items[Math.max(idx - 1, 0)] ?? items[items.length - 1];
        prev?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        items[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        items[items.length - 1]?.focus();
      }
    };

    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selected = listRef.current?.querySelector<HTMLButtonElement>(
      '[role="option"][aria-selected="true"]',
    );
    selected?.focus();
  }, [open]);

  return (
    <div className={`lang-switcher${open ? ' open' : ''}`} ref={rootRef}>
      <button
        type="button"
        id={buttonId}
        className="btn btn-ghost lang-switcher-trigger"
        aria-label={t('lang.aria')}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="lang-flag" aria-hidden>
          {active.flag}
        </span>
        <span className="lang-code">{active.code}</span>
        <ChevronDown size={14} className="lang-chevron" aria-hidden />
      </button>

      {open ? (
        <ul
          id={menuId}
          ref={listRef}
          className="lang-menu card"
          role="listbox"
          aria-labelledby={buttonId}
          aria-label={t('lang.menu')}
        >
          {LOCALE_META.map((opt) => {
            const selected = opt.value === locale;
            return (
              <li key={opt.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`lang-option${selected ? ' selected' : ''}`}
                  onClick={() => void persist(opt.value)}
                >
                  <span className="lang-flag" aria-hidden>
                    {opt.flag}
                  </span>
                  <span className="lang-option-label">{opt.label}</span>
                  <span className="lang-option-code">{opt.code}</span>
                  {selected ? <Check size={16} className="lang-check" aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
