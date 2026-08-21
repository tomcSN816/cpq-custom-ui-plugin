'use client';

import { useConfigurator } from '@/hooks/useConfigurator';
import SubmitProgressModal, { useSubmitProgress } from '@/components/SubmitProgressModal';

function formatCurrency(value) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

const SUBMIT_STEPS = ['Resolving account', 'Creating quote', 'Adding line items', 'Done'];

export default function ConfiguratorDemo() {
  const { fields, loading, messages, uuid, products, total, update } = useConfigurator();
  const progress = useSubmitProgress(SUBMIT_STEPS);

  // The root configured product (matched by the product ID we requested) is
  // where the blueprint's real, human-facing name lives — use it instead of
  // a generic label so every new demo starts titled after its own blueprint.
  const rootProduct = products.find(
    (p) => p.partnerId === process.env.NEXT_PUBLIC_LOGIK_PRODUCT_ID
  ) || products[0];
  const demoTitle = rootProduct?.name || 'CPQ Demo';

  async function handleSubmit() {
    progress.start();
    try {
      const res = await fetch('/api/servicenow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // TODO: map `products` (the BOM) into items for the API route.
          // Send the FULL tree, not a filtered/flattened list — the route
          // is what decides pricing/hierarchy (container nodes get priced
          // at 0 and linked via parent_line_item, not excluded; see its
          // comments). Each entry needs:
          //   { id, name, parentProduct, isRoot, price, quantity, uniqueIdentifier }
          // e.g.:
          //   products.map(p => ({
          //     id: p.id,
          //     name: p.name || p.id,
          //     parentProduct: p.parentProduct ?? null,
          //     isRoot: p.partnerId === process.env.NEXT_PUBLIC_LOGIK_PRODUCT_ID,
          //     price: p.rollUpPrice ?? 0,
          //     quantity: p.quantity ?? 1,
          //     uniqueIdentifier: p.uniqueIdentifier,
          //   }))
          items: [],
          logikUuid: uuid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      progress.succeed(data.quoteNumber ? `Created quote ${data.quoteNumber}.` : 'Submitted.');
    } catch (err) {
      progress.fail(err.message);
    }
  }

  const fieldNames = Object.keys(fields);

  return (
    <>
      <div className="topbar">
        <div className="topbar__inner">
          <div className="topbar__title">{demoTitle}</div>
          <div className="topbar__spacer" />
        </div>
      </div>

      <main className="page">
        {loading && !uuid ? (
          <div className="loading-screen">
            <div className="spinner" aria-hidden="true" />
            <div>Setting things up…</div>
            <div className="loading-screen-subtext">Just a moment while we get everything ready.</div>
          </div>
        ) : (
          <>
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
                  <h2 style={{ marginTop: 0 }}>You&apos;re connected to {demoTitle} — now build the actual demo</h2>
                  <p>
                    This page is intentionally blank. Your <strong>{demoTitle}</strong> blueprint
                    is already loaded ({fieldNames.length} fields came back, and the Bill of
                    Materials on the right is live) — nothing further needs wiring up on the
                    data side. What&apos;s left is describing what the demo should{' '}
                    <em>look like</em>.
                  </p>
                  <p>Just tell Claude Code what you want, the same way you&apos;re reading this. For example:</p>
                  <ul className="hint-list">
                    <li>&ldquo;Show the available products as selectable cards with their price&rdquo;</li>
                    <li>&ldquo;Add a dropdown for the deployment region using the region field&rdquo;</li>
                    <li>&ldquo;Make the header use our brand color and add a logo&rdquo;</li>
                    <li>&ldquo;When I submit, show a confirmation with the quote number&rdquo;</li>
                  </ul>
                  <p className="muted">
                    Reference fields by the variable names below when you describe changes —
                    Claude will read the current value with{' '}
                    <code>fields[&apos;variableName&apos;]?.value</code> and push changes back
                    with <code>update(&apos;variableName&apos;, newValue)</code>. You don&apos;t
                    need to write any of that yourself; just describe the field and what should
                    happen.
                  </p>
                </div>

                {fieldNames.length > 0 && (
                  <details className="card">
                    <summary>Loaded field variable names ({fieldNames.length})</summary>
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
                  <h2 style={{ marginTop: 0, fontSize: 16 }}>Bill of Materials</h2>
                  {products.length === 0 ? (
                    <p className="muted">No line items yet — select something in the configurator to see it here.</p>
                  ) : (
                    <>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="summary-table">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th style={{ textAlign: 'right' }}>Qty</th>
                              <th style={{ textAlign: 'right' }}>Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {products.map((p) => (
                              <tr key={p.uniqueIdentifier}>
                                <td style={{ paddingLeft: 4 + (p.level ?? 0) * 14 }}>
                                  {p.name || p.id}
                                  {p.productCode && (
                                    <div className="muted" style={{ fontSize: 11 }}>{p.productCode}</div>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right' }}>{p.quantity}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(p.rollUpPrice)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="total-bar">
                        <span className="total-bar__label">Total</span>
                        <span className="total-bar__value">{formatCurrency(total)}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="card">
                  <button
                    className="button"
                    style={{ width: '100%' }}
                    onClick={handleSubmit}
                    disabled={progress.status === 'running' || !uuid}
                  >
                    Submit Quote
                  </button>
                  <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>
                    This button already calls the ServiceNow quote API — it just isn&apos;t
                    sending any line items yet. Tell Claude which selected products/fields
                    should become quote line items and it&apos;ll fill in the{' '}
                    <code>items</code> array in this component&apos;s <code>handleSubmit</code>.
                  </p>
                </div>
              </div>
            </div>

            <SubmitProgressModal
              steps={SUBMIT_STEPS}
              status={progress.status}
              stepIndex={progress.stepIndex}
              resultMessage={progress.resultMessage}
              onClose={progress.close}
            />
          </>
        )}
      </main>
    </>
  );
}
