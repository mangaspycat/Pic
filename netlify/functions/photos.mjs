import { getStore } from '@netlify/blobs';

export default async () => {
  try {
    const store = getStore('photos');
    const { blobs } = await store.list();

    const photos = await Promise.all(
      blobs.map(async ({ key }) => {
        const meta = await store.getMetadata(key);
        return {
          id: key,
          filename: meta?.metadata?.filename || key,
          uploadedAt: meta?.metadata?.uploadedAt || null,
          size: meta?.metadata?.size || 0,
        };
      })
    );

    photos.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    return Response.json({ photos });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const config = {
  path: '/api/photos',
  method: 'GET',
};
