const Busboy = require('busboy');

// Vercel Functions have a 4.5 MB request-body limit.
// Headshots should ideally be much smaller than this anyway.
const MAX_FILE_SIZE = 4 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp'
]);

const SALESFORCE_API_VERSION = 'v67.0';

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';

    if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
      return reject(
        Object.assign(
          new Error('Expected multipart/form-data.'),
          { statusCode: 400 }
        )
      );
    }

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: 1,
        fileSize: MAX_FILE_SIZE,
        fields: 10
      }
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

        return reject(
          Object.assign(
            new Error('Only JPG, PNG, and WebP images are allowed.'),
            { statusCode: 400 }
          )
        );
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
        return reject(
          Object.assign(
            new Error('Image is too large. Maximum size is 4 MB.'),
            { statusCode: 413 }
          )
        );
      }

      if (!file) {
        return reject(
          Object.assign(
            new Error('No image file was received.'),
            { statusCode: 400 }
          )
        );
      }

      resolve(file);
    });

    busboy.on('error', err => {
      reject(
        Object.assign(err, { statusCode: 400 })
      );
    });

    req.pipe(busboy);
  });
}

function safeFilename(filename) {
  const lower = filename.toLowerCase();

  const ext = lower.endsWith('.png')
    ? '.png'
    : lower.endsWith('.webp')
      ? '.webp'
      : '.jpg';

  const base =
    filename
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'headshot';

  return `${base}-${Date.now()}${ext}`;
}

function getSalesforceConfig() {
  const domain = (
    process.env.SALESFORCE_DOMAIN || ''
  ).replace(/\/$/, '');

  const clientId =
    process.env.SALESFORCE_CLIENT_ID;

  const clientSecret =
    process.env.SALESFORCE_CLIENT_SECRET;

  if (!domain || !clientId || !clientSecret) {
    throw Object.assign(
      new Error(
        'Salesforce upload is not configured. ' +
        'Check SALESFORCE_DOMAIN, ' +
        'SALESFORCE_CLIENT_ID, and ' +
        'SALESFORCE_CLIENT_SECRET.'
      ),
      { statusCode: 500 }
    );
  }

  return {
    domain,
    clientId,
    clientSecret
  };
}

async function authenticateSalesforce() {
  const {
    domain,
    clientId,
    clientSecret
  } = getSalesforceConfig();

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret
  });

  const response = await fetch(
    `${domain}/services/oauth2/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded'
      },
      body
    }
  );

  const data =
    await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error(
      'Salesforce authentication failed:',
      response.status,
      data
    );

    throw Object.assign(
      new Error(
        data.error_description ||
        data.error ||
        `Salesforce authentication failed (${response.status}).`
      ),
      { statusCode: 502 }
    );
  }

  return {
    accessToken: data.access_token,
    instanceUrl: data.instance_url || domain
  };
}

async function salesforceRequest(
  instanceUrl,
  accessToken,
  path,
  options = {}
) {
  const response = await fetch(
    `${instanceUrl}/services/data/${SALESFORCE_API_VERSION}${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(options.body
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(options.headers || {})
      }
    }
  );

  const text = await response.text();

  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    console.error(
      'Salesforce API request failed:',
      response.status,
      path,
      data
    );

    const salesforceMessage =
      Array.isArray(data) && data[0]?.message
        ? data[0].message
        : data.message ||
          data.error_description ||
          data.error;

    throw Object.assign(
      new Error(
        salesforceMessage ||
        `Salesforce API request failed (${response.status}).`
      ),
      { statusCode: 502 }
    );
  }

  return data;
}

async function uploadFileToSalesforce(
  file,
  filename,
  instanceUrl,
  accessToken
) {
  const title =
    filename.replace(/\.[^.]+$/, '');

  // Creating ContentVersion also creates the
  // underlying ContentDocument automatically.
  const contentVersion =
    await salesforceRequest(
      instanceUrl,
      accessToken,
      '/sobjects/ContentVersion',
      {
        method: 'POST',
        body: JSON.stringify({
          Title: title,
          PathOnClient: filename,
          VersionData:
            file.buffer.toString('base64')
        })
      }
    );

  return contentVersion.id;
}

async function createPublicLink(
  contentVersionId,
  filename,
  instanceUrl,
  accessToken
) {
  const distribution =
    await salesforceRequest(
      instanceUrl,
      accessToken,
      '/sobjects/ContentDistribution',
      {
        method: 'POST',
        body: JSON.stringify({
          Name:
            `Email Signature Headshot - ${filename}`,

          ContentVersionId:
            contentVersionId,

          PreferencesAllowViewInBrowser: true,
          PreferencesAllowOriginalDownload: true,
          PreferencesLinkLatestVersion: true,
          PreferencesNotifyOnVisit: false,
          PreferencesPasswordRequired: false
        })
      }
    );

  // Salesforce generates the public URLs after
  // the ContentDistribution record is inserted,
  // so we must query the record again.
  const soql = `
    SELECT
      Id,
      ContentDownloadUrl,
      DistributionPublicUrl
    FROM ContentDistribution
    WHERE Id = '${distribution.id}'
    LIMIT 1
  `.replace(/\s+/g, ' ').trim();

  const result =
    await salesforceRequest(
      instanceUrl,
      accessToken,
      `/query?q=${encodeURIComponent(soql)}`,
      {
        method: 'GET'
      }
    );

  const record = result.records?.[0];

  if (!record?.ContentDownloadUrl) {
    throw Object.assign(
      new Error(
        'Salesforce created the file but did not return a public download URL.'
      ),
      { statusCode: 502 }
    );
  }

  return {
    distributionId: distribution.id,
    url: record.ContentDownloadUrl
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res
      .status(405)
      .json({
        error: 'Method not allowed.'
      });
  }

  try {
    const file =
      await parseMultipart(req);

    const filename =
      safeFilename(file.filename);

    const {
      accessToken,
      instanceUrl
    } = await authenticateSalesforce();

    const contentVersionId =
      await uploadFileToSalesforce(
        file,
        filename,
        instanceUrl,
        accessToken
      );

    const {
      distributionId,
      url
    } = await createPublicLink(
      contentVersionId,
      filename,
      instanceUrl,
      accessToken
    );

    return res.status(200).json({
      success: true,
      fileId: contentVersionId,
      distributionId,
      url
    });
  } catch (error) {
    console.error(
      'Headshot upload error:',
      error
    );

    return res
      .status(error.statusCode || 500)
      .json({
        error:
          error.message ||
          'Upload failed.'
      });
  }
};
