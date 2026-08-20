const HEADERS = {
  'Content-Type': 'application/vnd.logik.cfg-v2+json',
  'Accept':       'application/vnd.logik.cfg-v2+json',
};

export async function initConfig(productId, pricebookId) {
  const body = {
    sessionContext: { stateful: true },
    partnerData: {
      product: {
        configuredProductId: productId,
        configurationAttributes: {},
      },
    },
    fields: [],
    ...(pricebookId && { quote: { SBQQ__PricebookId__c: pricebookId } }),
  };

  const res = await fetch('/api/logik', {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Logik init failed (${res.status})`);
  return res.json();
}

export async function updateConfig(uuid, fields) {
  const res = await fetch(`/api/logik/${uuid}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) throw new Error(`Logik update failed (${res.status})`);
  return res.json();
}

// The BOM (`products`/`total`) returned inline on a field-update response is
// unreliable — Logik often comes back with `products: null` and no `total`
// on ordinary PATCH calls, even though the fields themselves updated fine.
// The dedicated GET /api/{uuid}/bom endpoint is the reliable source — call
// this after init and after every update instead of trusting the inline
// products/total on the update response itself.
export async function getBom(uuid) {
  const res = await fetch(`/api/logik/${uuid}/bom`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Logik BOM fetch failed (${res.status})`);
  return res.json();
}
