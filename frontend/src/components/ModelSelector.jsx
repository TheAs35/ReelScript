import { ChevronDown } from 'lucide-react'

const MODELS = [
  { value: 'tiny',   label: 'tiny',   hint: 'Rápido' },
  { value: 'base',   label: 'base',   hint: 'Equilibrado' },
  { value: 'small',  label: 'small',  hint: 'Preciso' },
  { value: 'medium', label: 'medium', hint: 'Muito preciso' },
]

export default function ModelSelector({ value, onChange }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-border bg-bg py-2.5 pl-3 pr-8 text-sm text-text outline-none focus:border-accent transition-colors cursor-pointer"
      >
        {MODELS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label} — {m.hint}
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
