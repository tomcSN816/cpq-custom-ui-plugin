export async function GET(request, { params }) {
  const { uuid } = await params;

  const res = await fetch(`${process.env.LOGIK_BASE_URL}/api/${uuid}/bom`, {
    headers: {
      'Accept':        'application/vnd.logik.cfg-v2+json',
      'Authorization': `Bearer ${process.env.LOGIK_TOKEN}`,
      'Origin':        process.env.LOGIK_ORIGIN || process.env.LOGIK_BASE_URL,
    },
  });

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
