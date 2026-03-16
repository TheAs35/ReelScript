import { ChevronDown } from 'lucide-react'

const LANGUAGES = [
  { value: 'auto', label: 'Auto-detectar' },
  { value: 'pt',   label: 'Português' },
  { value: 'en',   label: 'English' },
  { value: 'es',   label: 'Español' },
  { value: 'fr',   label: 'Français' },
  { value: 'de',   label: 'Deutsch' },
  { value: 'it',   label: 'Italiano' },
  { value: 'ja',   label: '日本語' },
  { value: 'ko',   label: '한국어' },
  { value: 'zh',   label: '中文' },
]

export default function LanguageSelector({ value, onChange }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-border bg-bg py-2.5 pl-3 pr-8 text-sm text-text outline-none focus:border-accent transition-colors cursor-pointer"
      >
        {LANGUAGES.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
      />
    </div>
  )
}
