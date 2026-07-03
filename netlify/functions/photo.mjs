import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  const { id } = context.params;

  if (!id) {
    return Response.json({ error: 'আইডি পাওয়া যায়নি' }, { status: 400 });
  }

  const store = getStore('photos');

  if (req.method === 'DELETE') {
    try {
      await store.delete(id);
      return Response.json({ success: true });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  const [data, meta] = await Promise.all([
    store.get(id, { type: 'arrayBuffer' }),
    store.getMetadata(id),
  ]);

  if (!data) {
    return new Response('ছবি পাওয়া যায়নি', { status: 404 });
  }

  const contentType = meta?.metadata?.contentType || 'application/octet-stream';

  return new Response(data, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};

export const config = {
  path: '/api/photo/:id',
  method: ['GET', 'DELETE'],
};
