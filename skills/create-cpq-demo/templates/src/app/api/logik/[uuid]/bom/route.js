export async function GET(request, { params }) {
  const { uuid } = await params;

  // bomType MUST be specified — calling this endpoint with no bomType
  // filter returns a separate, uninvalidated snapshot that does not
  // reflect field updates (verified: it can sit stale indefinitely, this
  // is not a recalculation delay). "SALES" is the standard type for a
  // customer-facing quote BOM; override via ?bomType=... if this demo's
  // blueprint uses a custom BOM type name.
  const { searchParams } = new URL(request.url);
  const bomType = searchParams.get('bomType') || 'SALES';

  const res = await fetch(`${process.env.LOGIK_BASE_URL}/api/${uuid}/bom?bomType=${encodeURIComponent(bomType)}`, {
    headers: {
      'Accept':        'application/vnd.logik.cfg-v2+json',
      'Authorization': `Bearer ${process.env.LOGIK_TOKEN}`,
      'Origin':        process.env.LOGIK_ORIGIN || process.env.LOGIK_BASE_URL,
    },
  });

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
