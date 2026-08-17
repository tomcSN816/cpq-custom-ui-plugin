'use client';

import { useState } from 'react';
import { useConfigurator } from '@/hooks/useConfigurator';

function formatCurrency(value) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export default function ConfiguratorDemo() {
  const { fields, loading, messages, uuid, products, total, update } = useConfigurator();
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

  const fieldNames = Object.keys(fields);

  return (
    <div>
      <div className="card">
        <h1>CPQ Demo</h1>
        <p className="muted">
          Session {uuid ? uuid.slice(0, 8) : '—'} · {fieldNames.length} fields loaded
        </p>
      </div>

      {messages?.length > 0 && (
        <div className="card">
          {messages.map((m, i) => (
            <div key={i} className="muted">{m.message ?? JSON.stringify(m)}</div>
          ))}
        </div>
      )}

      <div className="layout">
        <div className="layout__main">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>You're connected — now build the actual demo</h2>
            <p>
              This page is intentionally blank. Your Logik blueprint is already loaded (
              {fieldNames.length} fields came back, and the Bill of Materials on the right is
              live) — nothing further needs wiring up on the data side. What's left is
              describing what the demo should <em>look like</em>.
            </p>
            <p>
              Just tell Claude Code what you want, the same way you're reading this. For
              example:
            </p>
            <ul>
              <li>&ldquo;Show the available products as selectable cards with their price&rdquo;</li>
              <li>&ldquo;Add a dropdown for the deployment region using the region field&rdquo;</li>
              <li>&ldquo;Make the header use our brand color and add a logo&rdquo;</li>
              <li>&ldquo;When I submit, show a confirmation with the quote number&rdquo;</li>
            </ul>
            <p className="muted">
              Reference fields by the variable names below when you describe changes — Claude
              will read the current value with <code>fields[&apos;variableName&apos;]?.value</code> and
              push changes back with <code>update(&apos;variableName&apos;, newValue)</code>. You
              don't need to write any of that yourself; just describe the field and what should
              happen.
            </p>
          </div>

          {fieldNames.length > 0 && (
            <details className="card">
              <summary style={{ cursor: 'pointer' }}>
                Loaded field variable names ({fieldNames.length}) — click to expand
              </summary>
              <div
                className="muted"
                style={{
                  marginTop: 12,
                  maxHeight: 240,
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                {fieldNames.map((name) => (
                  <div key={name}>{name}</div>
                ))}
              </div>
            </details>
          )}
        </div>

        <div className="layout__sidebar">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Bill of Materials</h2>
            {products.length === 0 ? (
              <p className="muted">No line items yet — select something in the configurator to see it here.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 4px' }}>Name</th>
                      <th style={{ padding: '6px 4px', textAlign: 'right' }}>Qty</th>
                      <th style={{ padding: '6px 4px', textAlign: 'right' }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.uniqueIdentifier} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 4px', paddingLeft: 4 + (p.level ?? 0) * 14 }}>
                          {p.name || p.id}
                          <div className="muted" style={{ fontSize: 11 }}>{p.productCode}</div>
                        </td>
                        <td style={{ padding: '6px 4px', textAlign: 'right' }}>{p.quantity}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'right' }}>{formatCurrency(p.rollUpPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ textAlign: 'right', marginTop: 12, fontWeight: 600 }}>
                  Total: {formatCurrency(total)}
                </p>
              </div>
            )}
          </div>

          <div className="card">
            <button
              className="button"
              style={{ width: '100%' }}
              onClick={handleSubmit}
              disabled={submitting || !uuid}
            >
              {submitting ? 'Submitting…' : 'Submit Quote'}
            </button>
            <p className="muted" style={{ marginTop: 8 }}>
              This button already calls the ServiceNow quote API — it just isn't sending any
              line items yet. Tell Claude which selected products/fields should become quote
              line items and it'll fill in the <code>items</code> array in this component's{' '}
              <code>handleSubmit</code>.
            </p>
            {quoteNumber && <p className="muted">Created quote {quoteNumber}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
