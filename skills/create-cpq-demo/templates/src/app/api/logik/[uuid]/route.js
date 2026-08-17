export async function PATCH(request, { params }) {
  const { uuid } = await params;
  const body = await request.json();

  const res = await fetch(`${process.env.LOGIK_BASE_URL}/api/${uuid}`, {
    method: 'PATCH',
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
