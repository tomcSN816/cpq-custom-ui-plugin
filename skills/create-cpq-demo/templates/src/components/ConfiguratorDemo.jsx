'use client';

import { useState } from 'react';
import { useConfigurator } from '@/hooks/useConfigurator';

export default function ConfiguratorDemo() {
  const { fields, loading, messages, uuid, update } = useConfigurator();
  const [submitting, setSubmitting] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState(null);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/servicenow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [],       // TODO: map selected products/fields into { name, price } objects
          logikUuid: uuid,
        }),
      });
      const data = await res.json();
      setQuoteNumber(data.quoteNumber ?? null);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !uuid) {
    return <div className="card">Loading configurator…</div>;
  }

  return (
    <div>
      <div className="card">
        <h1>CPQ Demo</h1>
        <p className="muted">
          Session {uuid ? uuid.slice(0, 8) : '—'} · {Object.keys(fields).length} fields loaded
        </p>
      </div>

      {messages?.length > 0 && (
        <div className="card">
          {messages.map((m, i) => (
            <div key={i} className="muted">{m.message ?? JSON.stringify(m)}</div>
          ))}
        </div>
      )}

      <div className="card">
        <p className="muted">
          TODO: render your Logik fields here using <code>fields['yourVariableName']?.value</code>
          and call <code>update('yourVariableName', newValue)</code> on change.
        </p>
      </div>

      <div className="card">
        <button className="button" onClick={handleSubmit} disabled={submitting || !uuid}>
          {submitting ? 'Submitting…' : 'Submit Quote'}
        </button>
        {quoteNumber && <p className="muted">Created quote {quoteNumber}</p>}
      </div>
    </div>
  );
}
