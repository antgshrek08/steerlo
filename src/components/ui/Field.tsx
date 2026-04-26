type FieldProps = {
  label: string;
  id: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
};

export function Field({ label, id, type = "text", placeholder, required = false, autoComplete }: FieldProps) {
  return (
    <label className="mb-3 block" htmlFor={id}>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-1 text-rose-600">*</span> : null}
      </span>
      <input
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
        id={id}
        name={id}
        placeholder={placeholder}
        type={type}
        required={required}
        autoComplete={autoComplete}
      />
    </label>
  );
}
