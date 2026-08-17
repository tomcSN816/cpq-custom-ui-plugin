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
