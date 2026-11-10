// Shared field defaults, rendered only while the application uses a dark theme.
export function DarkTextDefaults({ dark, background = '#1a1a2e' }: { dark: boolean; background?: string }) {
  return dark ? <style>{`
    html, body { background-color: ${background}; }
    input, textarea, select { color-scheme: dark; }
    button:disabled, input:disabled, select:disabled, textarea:disabled { opacity: 1 !important; }
    input:not(:focus)::placeholder, textarea:not(:focus)::placeholder { color: currentColor; opacity: 1; }
    select option, select optgroup { background: #252535; color: #eeeeee; }
    input:-webkit-autofill, textarea:-webkit-autofill { -webkit-text-fill-color: #eeeeee; box-shadow: 0 0 0 1000px #252535 inset; }
  `}</style> : null;
}
