export async function POST(request) {
  const body = await request.json();

  const instance = process.env.SN_INSTANCE;
  const auth     = Buffer.from(`${process.env.SN_USERNAME}:${process.env.SN_PASSWORD}`).toString('base64');

  const headers = {
    'Authorization': `Basic ${auth}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
  };

  const get = (path) =>
    fetch(`${instance}/api/now/table/${path}`, { headers }).then(r => r.json());

  // --- 1. Resolve the account sys_id by name ---
  const accountRes   = await get(`customer_account?sysparm_query=name=${encodeURIComponent(process.env.SN_ACCOUNT_NAME)}&sysparm_limit=1`);
  const accountSysId = accountRes.result?.[0]?.sys_id;
  if (!accountSysId) return Response.json({ error: 'Account not found' }, { status: 404 });

  // --- 2. Resolve product offering sys_ids by name ---
  async function resolveOffering(name) {
    const res = await get(`sn_prd_pm_product_offering?sysparm_query=name=${encodeURIComponent(name)}&sysparm_limit=1`);
    return res.result?.[0]?.sys_id ?? null;
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
