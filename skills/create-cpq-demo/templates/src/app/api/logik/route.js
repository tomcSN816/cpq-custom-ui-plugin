export async function POST(request) {
  const body = await request.json();

  const res = await fetch(`${process.env.LOGIK_BASE_URL}/api`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/vnd.logik.cfg-v2+json',
      'Accept':        'application/vnd.logik.cfg-v2+json',
      'Authorization': `Bearer ${process.env.LOGIK_TOKEN}`,
      'Origin':        process.env.LOGIK_ORIGIN || process.env.LOGIK_BASE_URL,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
