# TFA Email Signature Generator — Wealth / Tax Toggle Implementation Spec

## Objective

Update the existing TFA Email Signature Generator so a user can switch between two signature brands from the same generator:

1. **Wealth** — the existing The Fox Alliance Wealth Advisors signature.
2. **Tax** — a new The Fox Alliance Tax signature.

The generator should continue to use one shared form, one shared headshot upload flow, and one shared signature template. Do **not** create or maintain two separate copies of the generator.

The currently selected brand should only change the brand-specific assets and links described below.

---

## Brand differences

### Wealth

Keep the current production signature behavior:

- Website display text: `thefoxalliance.com`
- Website link: `https://thefoxalliance.com/`
- Bottom brand image: existing Fox Alliance Wealth Advisors image
- Right-side recognition item: existing Forbes logo
- Forbes link: existing Forbes recognition URL

### Tax

Use the same signature layout and employee information, with only these changes:

- Website display text: `foxalliancetax.com`
- Website link: `https://foxalliancetax.com/`
- Bottom brand image: The Fox Alliance Tax image/logo
- Replace the Forbes logo with a **Client Portal** button
- Client Portal URL: `https://thefoxalliance.taxdome.com/login`
- Client Portal button dimensions:
  - Width: `100px` — same width as the current Forbes image
  - Height: `50px` — half the height of the current 100x100 Forbes image
- Client Portal button appearance:
  - Rectangle
  - Rounded corners
  - TFA navy background
  - White text
  - Centered text
  - Email-safe inline styles

All other signature elements must remain identical between Wealth and Tax unless explicitly changed later.

---

## Architecture

Use a single state variable and a brand configuration object.

Recommended structure:

```js
let activeBrand = 'wealth';

const BRANDS = {
  wealth: {
    label: 'Wealth',
    websiteText: 'thefoxalliance.com',
    websiteHref: 'https://thefoxalliance.com/',
    logoSrc: 'CURRENT_WEALTH_LOGO_URL',
    logoHref: 'https://thefoxalliance.com/',
    rightItem: {
      type: 'image',
      href: 'CURRENT_FORBES_LINK',
      src: 'CURRENT_FORBES_IMAGE_URL',
      alt: 'Forbes Logo',
      width: 100,
      height: 100
    }
  },

  tax: {
    label: 'Tax',
    websiteText: 'foxalliancetax.com',
    websiteHref: 'https://foxalliancetax.com/',
    logoSrc: 'REPLACE_WITH_PUBLIC_TAX_LOGO_URL',
    logoHref: 'https://foxalliancetax.com/',
    rightItem: {
      type: 'button',
      href: 'https://thefoxalliance.taxdome.com/login',
      text: 'Client Portal',
      width: 100,
      height: 50
    }
  }
};
```

Do not duplicate the entire signature HTML for each brand.

---

## 1. Add the Wealth / Tax selector

Add a new selector near the top of the form panel, before the current **Photo** section.

Recommended UI:

```text
Signature type

[ Wealth ] [ Tax ]
```

### Requirements

- Wealth is selected by default.
- The active button should be visually obvious.
- Use the same TFA design language as the rest of the generator.
- Switching brands must update the preview immediately.
- Switching brands must **not** clear:
  - headshot
  - name
  - title
  - additional title
  - phone numbers
  - extension
  - email
- The selected brand must also be reflected in copied/downloaded signature HTML.

Suggested markup:

```html
<div class="brand-switcher" role="group" aria-label="Signature type">
  <button type="button" class="brand-option active" data-brand="wealth">
    Wealth
  </button>
  <button type="button" class="brand-option" data-brand="tax">
    Tax
  </button>
</div>
```

Use button elements rather than radio inputs if that fits the current interface more naturally.

---

## 2. Give the website row IDs

The current website row is hard-coded to the wealth website.

Change it so JavaScript can update both the href and visible text.

Use:

```html
<p style="margin:0.04px;">
  <span style="color:#162b3b; font-size:13px; font-weight:500; font-family:Georgia,'Times New Roman',Times,serif; text-decoration:none;">
    W:
  </span>
  <a
    id="websiteLink"
    style="color:#fff; text-decoration:none; outline:none;"
    href="https://thefoxalliance.com/"
    target="_blank"
  >
    <span
      id="websiteText"
      style="color:#162b3b; font-size:13px; font-weight:500; font-family:Georgia,'Times New Roman',Times,serif; text-decoration:none;"
    >
      thefoxalliance.com
    </span>
  </a>
</p>
```

---

## 3. Make the bottom brand image dynamic

The current bottom image is hard-coded to the Wealth logo.

Add IDs to the existing anchor and image:

```html
<a
  id="brandLogoLink"
  href="https://thefoxalliance.com/"
  target="_blank"
>
  <img
    id="brandLogo"
    src="CURRENT_WEALTH_LOGO_URL"
    alt="The Fox Alliance"
    width="320"
    style="width:320px; height:auto; display:inline; border:0; outline:none; text-decoration:none;"
  >
</a>
```

### Tax behavior

When `activeBrand === 'tax'`:

- `brandLogoLink.href = 'https://foxalliancetax.com/'`
- `brandLogo.src = BRANDS.tax.logoSrc`
- Update alt text to something like `The Fox Alliance Tax`

Keep the width at `320px` and allow the height to scale automatically.

---

## 4. Replace the Forbes area dynamically

The current signature contains a right-side `<td>` with the 100x100 Forbes image.

Replace the contents of that `<td>` with a dynamic container:

```html
<td
  id="brandRightItem"
  align="right"
  bgcolor="#ffffff"
  style="background-color:#ffffff; vertical-align:top;"
>
</td>
```

Then build its contents from the selected brand.

### Wealth output

Render the existing Forbes image:

```html
<a
  href="CURRENT_FORBES_LINK"
  target="_blank"
>
  <img
    src="CURRENT_FORBES_IMAGE_URL"
    alt="Forbes Logo"
    width="100"
    height="100"
    style="width:100px; height:100px; display:block; border:0; outline:none; text-decoration:none;"
  >
</a>
```

### Tax output

Render an email-safe Client Portal CTA:

```html
<table
  role="presentation"
  cellpadding="0"
  cellspacing="0"
  border="0"
  width="100"
  style="border-collapse:separate; width:100px;"
>
  <tr>
    <td
      align="center"
      valign="middle"
      width="100"
      height="50"
      bgcolor="#0b3352"
      style="width:100px; height:50px; background-color:#0b3352; border-radius:8px;"
    >
      <a
        href="https://thefoxalliance.taxdome.com/login"
        target="_blank"
        style="display:block; width:100px; line-height:50px; color:#ffffff; font-family:Arial,Helvetica,sans-serif; font-size:12px; font-weight:bold; text-decoration:none; white-space:nowrap;"
      >
        Client Portal
      </a>
    </td>
  </tr>
</table>
```

The button should occupy the same `100px` horizontal footprint as the Forbes image while being `50px` high.

Note: some legacy Outlook desktop versions may ignore `border-radius`; the button must still remain functional and readable as a normal rectangle.

---

## 5. Add brand rendering logic

Create a function dedicated to brand-specific rendering:

```js
function renderBrand() {
  const brand = BRANDS[activeBrand];

  const websiteLink = document.getElementById('websiteLink');
  const websiteText = document.getElementById('websiteText');
  const brandLogoLink = document.getElementById('brandLogoLink');
  const brandLogo = document.getElementById('brandLogo');
  const rightItem = document.getElementById('brandRightItem');

  websiteLink.href = brand.websiteHref;
  websiteText.textContent = brand.websiteText;

  brandLogoLink.href = brand.logoHref;
  brandLogo.src = brand.logoSrc;
  brandLogo.alt =
    activeBrand === 'tax'
      ? 'The Fox Alliance Tax'
      : 'The Fox Alliance Wealth Advisors';

  if (brand.rightItem.type === 'image') {
    rightItem.innerHTML = `
      <table cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff"
        style="border-collapse:collapse; background-color:#ffffff;">
        <tr>
          <td bgcolor="#ffffff" style="background-color:#ffffff; line-height:1px;">
            <p style="margin:0.04px;">
              <a href="${brand.rightItem.href}" target="_blank">
                <img
                  src="${brand.rightItem.src}"
                  alt="${brand.rightItem.alt}"
                  width="${brand.rightItem.width}"
                  height="${brand.rightItem.height}"
                  style="width:${brand.rightItem.width}px; height:${brand.rightItem.height}px; display:block; border:0; outline:none; text-decoration:none;"
                >
              </a>
            </p>
          </td>
        </tr>
      </table>
    `;
  } else {
    rightItem.innerHTML = `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100"
        style="border-collapse:separate; width:100px;">
        <tr>
          <td
            align="center"
            valign="middle"
            width="100"
            height="50"
            bgcolor="#0b3352"
            style="width:100px; height:50px; background-color:#0b3352; border-radius:8px;"
          >
            <a
              href="${brand.rightItem.href}"
              target="_blank"
              style="display:block; width:100px; line-height:50px; color:#ffffff; font-family:Arial,Helvetica,sans-serif; font-size:12px; font-weight:bold; text-decoration:none; white-space:nowrap;"
            >
              ${brand.rightItem.text}
            </a>
          </td>
        </tr>
      </table>
    `;
  }
}
```

Then make the existing master render function call it:

```js
function render() {
  updateSignatureDOM();
  renderBrand();
}
```

---

## 6. Hook up the selector

Add:

```js
document.querySelectorAll('[data-brand]').forEach(function(button) {
  button.addEventListener('click', function() {
    activeBrand = button.dataset.brand;

    document.querySelectorAll('[data-brand]').forEach(function(otherButton) {
      otherButton.classList.toggle(
        'active',
        otherButton.dataset.brand === activeBrand
      );
    });

    render();
  });
});
```

No employee data should be reset when the brand changes.

---

## 7. Reset behavior

Keep the existing reset behavior for employee fields.

Recommended behavior:

- Reset name/title/contact/headshot fields.
- Do **not** change the selected Wealth/Tax brand.

This lets a Tax employee clear their information without unexpectedly being switched back to Wealth.

---

## 8. Make generator-only explanatory text brand-neutral

The current preview note refers specifically to the Forbes badge.

Replace it with something brand-neutral, for example:

```text
This preview mirrors the approved Fox Alliance signature template. Choose Wealth or Tax, enter your information, then copy or download the finished signature.
```

This text is part of the generator UI only and should not be included in the copied signature.

---

## 9. Clean up stale HubSpot frontend wording

The headshot upload backend now uses Salesforce, but the current frontend still contains HubSpot-specific comments/error text.

Replace any remaining lines like:

```js
throw new Error('HubSpot did not return an image URL.');
```

with:

```js
throw new Error('Salesforce did not return an image URL.');
```

Also replace comments such as:

```js
// Use the HubSpot-hosted image in the signature
```

with:

```js
// Use the Salesforce-hosted public image in the signature
```

Keep the existing `/api/upload-headshot` endpoint unchanged.

---

## 10. Tax logo asset

Before the Tax signature can be complete, provide a stable **public URL** for the Tax logo/image.

Preferred approach for the current architecture:

1. Upload the approved Tax signature logo/image to Salesforce Files.
2. Create a public link for it.
3. Use the direct public image/download URL as `BRANDS.tax.logoSrc`.

Do not use:
- a local file path
- a private Salesforce URL that requires login
- a temporary browser blob URL
- a relative URL that will break after the signature is pasted into Outlook

The final URL must be fetchable by an email recipient without Salesforce authentication.

---

## 11. Existing Wealth asset values

Use the current values already present in the production signature for Wealth rather than changing them during this feature.

Current Wealth website:

```text
https://thefoxalliance.com/
```

Current Forbes link:

```text
https://www.forbes.com/companies/the-fox-alliance/?list=wealth-management-teams-best-in-state
```

The current Wealth Forbes and bottom logo image URLs should remain unchanged until TFA intentionally migrates those static assets away from the old hosting location.

---

## 12. Acceptance criteria

The feature is complete only when all of the following pass:

### Wealth mode

- Wealth is selected by default.
- Existing headshot upload still works.
- Website displays `thefoxalliance.com`.
- Website links to `https://thefoxalliance.com/`.
- Existing Wealth logo displays.
- Existing Forbes badge displays at 100x100.
- Forbes badge links to the existing Forbes page.
- Copy Signature output matches the Wealth preview.
- Downloaded HTML matches the Wealth preview.

### Tax mode

- Clicking Tax immediately changes the preview without clearing user data.
- Website displays `foxalliancetax.com`.
- Website links to `https://foxalliancetax.com/`.
- Tax logo replaces the Wealth logo.
- Forbes badge disappears.
- Client Portal button appears.
- Client Portal button is 100px wide and 50px high.
- Client Portal button has rounded corners.
- Client Portal button links to `https://thefoxalliance.taxdome.com/login`.
- Headshot upload continues to work exactly as it does in Wealth mode.
- Copy Signature output contains the Tax logo, Tax website, and Client Portal button.
- Downloaded HTML contains the Tax logo, Tax website, and Client Portal button.
- No Wealth-only Forbes content appears in Tax output.

### Cross-mode behavior

- Switching repeatedly between Wealth and Tax does not duplicate DOM elements.
- Employee information persists while switching brands.
- Uploaded headshot persists while switching brands.
- Optional mobile/additional-title toggles continue to work.
- No Salesforce credentials or secrets are exposed in `index.html`.
- `/api/upload-headshot` remains server-side only.

---

## 13. Recommended commit

Once implemented and tested:

```bash
git checkout -b feature/tax-signature-toggle
git add .
git commit -m "Add Wealth and Tax signature toggle"
git push -u origin feature/tax-signature-toggle
```

Use the Vercel preview deployment generated from the branch to test both signature modes before merging to `main`.

After validation:

```bash
git checkout main
git pull
git merge feature/tax-signature-toggle
git push
```

Vercel should then deploy the merged production version automatically.

---

## Files expected to change

At minimum:

```text
index.html
README.md
```

No change should be required to:

```text
api/upload-headshot.js
package.json
```

unless separate cleanup is desired.

The Tax logo itself can either live as a static asset with a stable absolute public URL or, preferably for the current architecture, be hosted as a public Salesforce File and referenced from the brand configuration.
