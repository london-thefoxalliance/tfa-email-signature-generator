# tfa-email-signature-generator

Generates templated email signatures for The Fox Alliance employees. A single generator supports two signature brands from one shared form, headshot upload flow, and signature template:

- **Wealth** — The Fox Alliance Wealth Advisors signature (default).
- **Tax** — The Fox Alliance Tax signature.

Switching between Wealth and Tax with the selector at the top of the form only changes brand-specific assets and links (website, bottom logo, and the Forbes badge / Client Portal button). It never clears the headshot, name, title, phone numbers, extension, or email already entered.

## Setup

1. Deploy this folder to Vercel.
2. In Vercel Project Settings > Environment Variables, add:
   - `SALESFORCE_DOMAIN` = your Salesforce org's login domain (e.g. `https://your-org.my.salesforce.com`)
   - `SALESFORCE_CLIENT_ID` = the Connected App's client ID
   - `SALESFORCE_CLIENT_SECRET` = the Connected App's client secret
   Do not put these values in `index.html`; they are only read server-side by `api/upload-headshot.js`.
3. In Salesforce, set up a Connected App with the OAuth 2.0 Client Credentials Flow enabled, and grant it permission to create `ContentVersion` and `ContentDistribution` records.
4. Redeploy after adding the environment variables.
5. Test the headshot upload in the generator.

The generator keeps the existing signature HTML in the page and only uses JavaScript for data binding, brand switching, and interactions. Uploaded JPG/PNG/WebP images are sent to `/api/upload-headshot`, which uploads them to Salesforce Files (as a `ContentVersion`) using the server-side Connected App credentials, then creates a public `ContentDistribution` link so the image is fetchable from Outlook/Gmail without requiring Salesforce authentication.

## Adding the Tax logo asset

`index.html` currently ships with a placeholder value (`REPLACE_WITH_PUBLIC_TAX_LOGO_URL`) for `BRANDS.tax.logoSrc`. Before the Tax signature is production-ready:

1. Upload the approved Tax signature logo/image to Salesforce Files.
2. Create a public link for it (a `ContentDistribution` record, same mechanism the headshot upload uses).
3. Copy the direct public image/download URL.
4. In `index.html`, find `BRANDS.tax.logoSrc` and replace `REPLACE_WITH_PUBLIC_TAX_LOGO_URL` with that URL.

Do not use a local file path, a private Salesforce URL that requires login, a temporary browser blob URL, or a relative URL — the final URL must be fetchable by an email recipient with no Salesforce authentication.

## Brand configuration

Brand-specific values live in a single `BRANDS` object in `index.html` (see the `<script>` block), keyed by `wealth` and `tax`. Each entry defines the website text/link, bottom logo src/href/alt, and the right-side item (Forbes image for Wealth, Client Portal button for Tax). A `renderBrand()` function applies the active brand's values to the shared signature template — there is only one signature template in the DOM, never two brand-specific copies.
