# tfa-email-signature-generator
Generators templated signatures for both Tax and Wealth TFA employees.

Setup
1. Deploy this folder to Vercel.
2. In Vercel Project Settings > Environment Variables, add:
   HUBSPOT_ACCESS_TOKEN = YOUR_HUBSPOT_SERVICE_KEY
   Do not put the key in index.html.
3. In HubSpot File Manager, create this folder:
   /Fox Alliance Signature Headshots
4. Redeploy after adding the environment variable.
5. Test Upload in the generator.

The generator keeps the existing signature HTML in the page and only uses JavaScript for data binding and interactions. Uploaded JPG/PNG/WebP images are sent to /api/upload-headshot, which uploads them to HubSpot using the server-side service key.
