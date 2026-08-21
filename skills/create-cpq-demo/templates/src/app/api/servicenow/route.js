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

  const post = async (path, payload) => {
    const res = await fetch(`${instance}/api/now/table/${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`ServiceNow POST ${path} failed (${res.status}): ${JSON.stringify(data)}`);
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
  let quoteSysId, quoteNumber;
  try {
    const quoteData = await post('sn_quote_mgmt_core_quote', {
      quote_type:        'add',
      short_description: 'Demo Quote',
      account:           accountSysId,
      state:             'draft',
      currency:          'USD',
    });
    quoteSysId  = quoteData.result?.sys_id;
    quoteNumber = quoteData.result?.number;
  } catch (err) {
    return Response.json({ error: `Failed to create quote: ${err.message}` }, { status: 502 });
  }

  // --- 4. Create line items, preserving the BOM's bundle hierarchy ---
  //
  // Expected shape of each `body.items` entry (see the BOM's `products`
  // array from getBom()):
  //   { id, name, parentProduct, isRoot, price, quantity, uniqueIdentifier }
  //
  // A BOM often contains container/category nodes (e.g. "Cash Management")
  // whose price is the SUM of their children's prices — creating them at
  // that summed price alongside their children would double-count the
  // cost. Containers are still created as real line items (so the
  // hierarchy shows correctly in the quote), just priced at 0, with their
  // children linked via `parent_line_item` / `top_line_item` — fields the
  // sn_quote_mgmt_core_quote_line_item table provides specifically for
  // this (verified via its schema; also has `bom_line_id` /
  // `parent_bom_line_id` string fields for correlating back to the
  // configurator's own BOM line IDs, populated here from
  // `uniqueIdentifier`).
  const items = body.items ?? [];
  const isContainer = (id) => items.some((it) => it.parentProduct === id);

  const snSysIdByProductId = {};
  let rootSysId = null;

  async function createLine(item, parentSysId) {
    const offeringSysId = await resolveOffering(item.name);
    const data = await post('sn_quote_mgmt_core_quote_line_item', {
      quote:                   quoteSysId,
      product_offering:        offeringSysId,
      short_description:       item.name,
      quantity:                String(item.quantity ?? 1),
      monthly_recurring_price: String(isContainer(item.id) ? 0 : item.price ?? 0),
      action:                  'add',
      state:                   'draft',
      account:                 accountSysId,
      parent_line_item:        parentSysId || undefined,
      top_line_item:           rootSysId || undefined,
      bom_line_id:             item.uniqueIdentifier || undefined,
      parent_bom_line_id:      items.find((it) => it.id === item.parentProduct)?.uniqueIdentifier || undefined,
    });
    return data.result?.sys_id;
  }

  const root = items.find((it) => it.isRoot);
  const remaining = items.filter((it) => it !== root);

  if (root) {
    rootSysId = await createLine(root, null);
    snSysIdByProductId[root.id] = rootSysId;
  }

  // Process in dependency order: an item is eligible once it has no
  // parentProduct (defaults under the root) or its parent has already
  // been created. Loop rather than assume `level` ordering, since depth
  // can vary across blueprints.
  let guard = remaining.length + 1; // avoids an infinite loop if data has a cycle/dangling parent
  while (remaining.length && guard-- > 0) {
    const idx = remaining.findIndex(
      (it) => !it.parentProduct || snSysIdByProductId[it.parentProduct] !== undefined
    );
    if (idx === -1) break;
    const item = remaining.splice(idx, 1)[0];
    const parentSysId = item.parentProduct ? snSysIdByProductId[item.parentProduct] : rootSysId;
    snSysIdByProductId[item.id] = await createLine(item, parentSysId);
  }

  return Response.json({ quoteNumber, quoteSysId });
}
