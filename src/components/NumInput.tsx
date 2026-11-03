/** Parse a typed amount: strips commas/spaces, empty -> null. */
export function parseAmount(text: string): number | null {
  const digits = text.replace(/[^0-9]/g, '');
  return digits === '' ? null : Number(digits);
}

interface Props {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  ariaLabel: string;
}

export default function NumInput({ value, onChange, placeholder, ariaLabel }: Props) {
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={ariaLabel}
      placeholder={placeholder ?? '0'}
      value={value == null ? '' : String(value)}
      onChange={(e) => onChange(parseAmount(e.target.value))}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-right text-sm font-medium tabular-nums focus:border-indigo-500 focus:outline-none"
    />
  );
}
