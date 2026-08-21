export async function POST(request) {
  const body = await request.json();

  const instance = process.env.SN_INSTANCE;
  const auth     = Buffer.from(`${process.env.SN_USERNAME}:${process.env.SN_PASSWORD}`).toString('base64');

  const headers = {
    'Authorization': `Basic ${auth}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
  };

  // Check response.ok before parsing — otherwise an auth failure (e.g. a
  // mangled SN_PASSWORD, see note in .env.example) or any other upstream
  // error gets misread as "the query just returned nothing" instead of
  // surfacing what actually went wrong.
  const get = async (path) => {
    const res = await fetch(`${instance}/api/now/table/${path}`, { headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`ServiceNow GET ${path} failed (${res.status}): ${JSON.stringify(data)}`);
    return data;
  };

  // --- 1. Resolve the account sys_id by name ---
  let accountRes;
  try {
    accountRes = await get(`customer_account?sysparm_query=name=${encodeURIComponent(process.env.SN_ACCOUNT_NAME)}&sysparm_limit=1`);
  } catch (err) {
    return Response.json({ error: `ServiceNow request failed: ${err.message}` }, { status: 502 });
  }
  const accountSysId = accountRes.result?.[0]?.sys_id;
  if (!accountSysId) return Response.json({ error: `Account "${process.env.SN_ACCOUNT_NAME}" not found` }, { status: 404 });

  // --- 2. Resolve product offering sys_ids by name ---
  // Line items from a Logik BOM (bundle components, add-ons) often don't
  // correspond 1:1 with a real sn_prd_pm_product_offering record by that
  // exact name — that's a catalog-modeling question for this specific
  // demo, not a bug here. Missing offerings just leave that field blank
  // rather than failing the whole quote.
  async function resolveOffering(name) {
    try {
      const res = await get(`sn_prd_pm_product_offering?sysparm_query=name=${encodeURIComponent(name)}&sysparm_limit=1`);
      return res.result?.[0]?.sys_id ?? null;
    } catch (err) {
      console.error(`Offering lookup failed for "${name}":`, err.message);
      return null;
    }
  }

  // --- 3. Create the quote ---
  const quoteRes = await fetch(`${instance}/api/now/table/sn_quote_mgmt_core_quote`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      quote_type:        'add',
      short_description: 'Demo Quote',
      account:           accountSysId,
      state:             'draft',
      currency:          'USD',
    }),
  });

  const quoteData   = await quoteRes.json();
  const quoteSysId  = quoteData.result?.sys_id;
  const quoteNumber = quoteData.result?.number;

  // --- 4. Create line items ---
  for (const item of body.items ?? []) {
    const offeringSysId = await resolveOffering(item.name);

    await fetch(`${instance}/api/now/table/sn_quote_mgmt_core_quote_line_item`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        quote:                   quoteSysId,
        product_offering:        offeringSysId,
        short_description:       item.name,
        quantity:                '1',
        monthly_recurring_price: String(item.price ?? 0),
        action:                  'add',
        state:                   'draft',
        account:                 accountSysId,
      }),
    });
  }

  return Response.json({ quoteNumber, quoteSysId });
}
