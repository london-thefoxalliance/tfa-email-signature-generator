const Busboy = require('busboy');

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
      return reject(Object.assign(new Error('Expected multipart/form-data.'), { statusCode: 400 }));
    }

    const busboy = Busboy({
      headers: req.headers,
      limits: { files: 1, fileSize: MAX_FILE_SIZE, fields: 10 }
    });

    let file = null;
    let tooLarge = false;

    busboy.on('file', (fieldname, stream, info) => {
      if (fieldname !== 'file') {
        stream.resume();
        return;
      }

      const chunks = [];
      let size = 0;
      const { filename, mimeType } = info;

      if (!ALLOWED_TYPES.has(mimeType)) {
        stream.resume();
        return reject(Object.assign(new Error('Only JPG, PNG, and WebP images are allowed.'), { statusCode: 400 }));
      }

      stream.on('data', chunk => {
        size += chunk.length;
        chunks.push(chunk);
      });

      stream.on('limit', () => {
        tooLarge = true;
      });

      stream.on('end', () => {
        if (tooLarge) return;
        file = {
          buffer: Buffer.concat(chunks),
          filename: filename || 'headshot.jpg',
          mimeType,
          size
        };
      });
    });

    busboy.on('finish', () => {
      if (tooLarge) {
        return reject(Object.assign(new Error('Image is too large. Maximum size is 5 MB.'), { statusCode: 413 }));
      }
      if (!file) {
        return reject(Object.assign(new Error('No image file was received.'), { statusCode: 400 }));
      }
      resolve(file);
    });

    busboy.on('error', err => reject(Object.assign(err, { statusCode: 400 })));
    req.pipe(busboy);
  });
}

function safeFilename(filename) {
  const ext = filename.toLowerCase().endsWith('.png') ? '.png'
    : filename.toLowerCase().endsWith('.webp') ? '.webp' : '.jpg';
  const base = filename.replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'headshot';
  return `${base}-${Date.now()}${ext}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'HubSpot upload is not configured yet.' });
  }

  try {
    const file = await parseMultipart(req);
    const filename = safeFilename(file.filename);

    const form = new FormData();
    form.append('file', new Blob([file.buffer], { type: file.mimeType }), filename);
    form.append('folderPath', '/Fox Alliance Signature Headshots');
    form.append('options', JSON.stringify({
      access: 'PUBLIC_NOT_INDEXABLE',
      overwrite: false,
      duplicateValidationStrategy: 'NONE',
      duplicateValidationScope: 'EXACT_FOLDER'
    }));

    const response = await fetch('https://api.hubapi.com/files/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('HubSpot upload failed:', response.status, data);
      return res.status(502).json({
        error: 'HubSpot could not upload the image.',
        details: data.message || data.error || `HTTP ${response.status}`
      });
    }

    return res.status(200).json({
      success: true,
      fileId: data.id || data.fileId,
      url: data.url || data.defaultHostingUrl
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Upload failed.' });
  }
};
