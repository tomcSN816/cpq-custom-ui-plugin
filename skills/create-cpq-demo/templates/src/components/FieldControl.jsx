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
//
// `messages`: pass the subset of the session's `messages` array whose
// `field`/`target` matches this field's variableName (and, for a row inside
// a picker grid, the row's index too) — see ConfiguratorDemo.jsx for the
// matching helper. Rendered inline under the control, which is what rule
// feedback like "4 entities, notional cash pooling could significantly
// reduce idle cash." is actually about — showing it in a generic list at
// the top of the page loses that context.
function FieldMessages({ messages }) {
  if (!messages?.length) return null;
  return (
    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {messages.map((m, i) => (
        <div
          key={i}
          className="muted"
          style={{ color: m.type === 'error' || m.error ? '#b42318' : 'var(--text-muted)' }}
        >
          {m.message}
        </div>
      ))}
    </div>
  );
}

export default function FieldControl({ field, label, widget, min = 1, max = 10, readOnly = false, messages = [], onChange }) {
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
        <FieldMessages messages={messages} />
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
        <FieldMessages messages={messages} />
      </div>
    );
  }

  // `dataType: "array"` does NOT necessarily mean a simple multi-select —
  // some fields with this dataType are actually row-based picker grids
  // (MultiSelectProductPickerGrid) with a `field.rows.content` structure,
  // where each row must be toggled via `updatePickerSelect` on a nested
  // `<name>.select` sub-field, not via a plain `update(name, newArray)`
  // call on this top-level field (that update gets silently ignored).
  // Check `field.rows` before reaching this branch — if present, render
  // the rows yourself (see ConfiguratorDemo.jsx's Add-ons grid handling)
  // instead of routing it through this generic checkbox-list branch.
  if (field.dataType === 'array') {
    // Chips for what's selected (with a way to remove, unless the option
    // is itself locked/mandatory) + a dropdown to add more. Scales much
    // better than a long checkbox list once there are more than a
    // handful of options (e.g. a list of currencies or countries).
    const selected = Array.isArray(field.value) ? field.value : [];
    const selectableToAdd = options.filter(
      (opt) => !selected.includes(opt.value) && opt.state !== 'disabled'
    );
    return (
      <div>
        <div className="field-label">{label}</div>
        <div className="chip-group">
          {selected.length === 0 && <span className="muted">None selected</span>}
          {selected.map((value) => {
            const opt = options.find((o) => o.value === value);
            const isLocked = opt?.state === 'disabled';
            return (
              <span key={value} className="chip">
                {opt?.label ?? value}
                {!isLocked && (
                  <button
                    type="button"
                    className="chip__remove"
                    aria-label={`Remove ${opt?.label ?? value}`}
                    onClick={() => onChange(selected.filter((v) => v !== value))}
                  >
                    ×
                  </button>
                )}
              </span>
            );
          })}
        </div>
        {selectableToAdd.length > 0 && (
          <select
            className="field-input"
            style={{ marginTop: 8 }}
            value=""
            onChange={(e) => {
              if (e.target.value) onChange([...selected, e.target.value]);
            }}
          >
            <option value="">+ Add…</option>
            {selectableToAdd.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
        <FieldMessages messages={messages} />
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
        <FieldMessages messages={messages} />
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
        <FieldMessages messages={messages} />
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
        // Select the existing value on focus so typing replaces it instead
        // of inserting before/after it — without this, clicking into a
        // number field that starts at 0 and typing "1000" produces "01000"
        // (cursor lands after the existing digit rather than the whole
        // value being selected).
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(field.dataType === 'number' ? Number(e.target.value) : e.target.value)}
      />
      <FieldMessages messages={messages} />
    </div>
  );
}
