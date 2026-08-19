'use client';

// Generic renderer for a single Logik field, driven by what the runtime API
// actually tells us about it (dataType, optionSet, editable) rather than by
// hardcoding a widget per variable name. Use this as the default when
// building a layout-driven UI (see SKILL.md Step 4) — override per-field
// only where the blueprint's layout explicitly calls for something this
// can't express (e.g. a slider — pass widget="slider").
//
// Note: the API's `editable` flag reflects whether the field is CURRENTLY
// locked, not whether the blueprint's layout designates it as a read-only
// display widget (ReadOnlyText/ReadOnlyCurrency) — those can be `editable:
// "true"` on the wire while still being intended as computed/informational.
// Pass `readOnly` explicitly from the layout config for fields like that;
// don't rely on `editable` alone to decide.
export default function FieldControl({ field, label, widget, min = 1, max = 10, readOnly = false, onChange }) {
  if (!field) return null;

  const disabled = readOnly || field.editable === 'false';
  const options = field.optionSet?.options ?? [];

  if (disabled) {
    const displayValue =
      typeof field.value === 'boolean' ? (field.value ? 'Yes' : 'No') : field.value ?? '—';
    return (
      <div>
        <div className="field-label">{label}</div>
        <div className="field-readonly">{displayValue}</div>
      </div>
    );
  }

  if (field.dataType === 'boolean') {
    return (
      <div>
        <div className="field-label">{label}</div>
        <div className="field-radio-group">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`field-radio ${String(field.value) === opt.value ? 'field-radio--active' : ''}`}
              onClick={() => onChange(opt.value === 'true')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.dataType === 'array') {
    const selected = Array.isArray(field.value) ? field.value : [];
    return (
      <div>
        <div className="field-label">{label}</div>
        <div className="field-checkbox-group">
          {options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            const isDisabled = opt.state === 'disabled';
            return (
              <label key={opt.value} className="field-checkbox">
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => {
                    const next = isSelected
                      ? selected.filter((v) => v !== opt.value)
                      : [...selected, opt.value];
                    onChange(next);
                  }}
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (widget === 'slider') {
    return (
      <div>
        <div className="field-label">
          {label} <span className="muted">({field.value})</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={field.value ?? min}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
    );
  }

  if (options.length > 0) {
    return (
      <div>
        <div className="field-label">{label}</div>
        <select
          className="field-input"
          value={field.value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled>Select…</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div>
      <div className="field-label">{label}</div>
      <input
        className="field-input"
        type={field.dataType === 'number' ? 'number' : 'text'}
        value={field.value ?? ''}
        onChange={(e) => onChange(field.dataType === 'number' ? Number(e.target.value) : e.target.value)}
      />
    </div>
  );
}
