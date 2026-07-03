import { getStore } from '@netlify/blobs';

// Netlify functions buffer requests up to 6MB; base64 adds ~33% overhead,
// so we cap the original file at ~4.5MB to stay safely under that limit.
const MAX_BYTES = 4.5 * 1024 * 1024;

export default async (req) => {
  try {
    const { filename, contentType, data } = await req.json();

    if (!filename || !data) {
      return Response.json(
        { error: 'ফাইলের নাম বা ছবির ডেটা পাওয়া যায়নি' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(data, 'base64');

    if (buffer.length > MAX_BYTES) {
      return Response.json(
        { error: 'ছবিটা অনেক বড়। ৪ এমবি-র কম সাইজের ছবি দাও।' },
        { status: 413 }
      );
    }

    const store = getStore('photos');
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    await store.set(id, buffer, {
      metadata: {
        filename,
        contentType: contentType || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
        size: buffer.length,
      },
    });

    return Response.json({ success: true, id });
  } catch (err) {
    return Response.json(
      { error: 'আপলোড ব্যর্থ হয়েছে: ' + err.message },
      { status: 500 }
    );
  }
};

export const config = {
  path: '/api/upload',
  method: 'POST',
};
