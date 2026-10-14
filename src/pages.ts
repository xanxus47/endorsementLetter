import { escapeHtml, letterStyles, renderLetterMarkup } from './letter-html'
import type { Endorsement } from './schemas'

const previewStyles = `
  :root {
    --green: #0b5d1e;
    --ink: #142016;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Segoe UI", system-ui, sans-serif;
    background: #d7d7d7;
    color: var(--ink);
  }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .btn, button {
    appearance: none;
    border: 0;
    border-radius: 8px;
    padding: 8px 12px;
    background: #1f7a38;
    color: #fff;
    text-decoration: none;
    font: inherit;
    cursor: pointer;
    display: inline-block;
  }
  .btn.secondary { background: #3d5341; }
  .btn.ghost { background: #e6eee6; color: var(--ink); }
  .preview-bar {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 12px 18px;
    background: #103816;
    color: #fff;
  }
  @media print {
    .preview-bar { display: none; }
  }
`

export function renderPreviewPage(letter: Endorsement): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(letter.team)} endorsement</title>
    <style>
      ${previewStyles}
      ${letterStyles}
    </style>
  </head>
  <body>
    <div class="preview-bar">
      <div>
        <strong>${escapeHtml(letter.team)}</strong>
        <span> · A4 preview</span>
      </div>
      <div class="actions">
        <a class="btn ghost" href="/">All letters</a>
        <a class="btn secondary" href="/app.html?edit=${encodeURIComponent(letter.id)}">Edit</a>
        <a class="btn" href="/api/endorsements/${encodeURIComponent(letter.id)}/download">Download PDF</a>
        <button class="btn" type="button" onclick="window.print()">Print</button>
      </div>
    </div>
    <div class="sheet">
      ${renderLetterMarkup(letter)}
    </div>
  </body>
</html>`
}

export function renderNotFound(message = 'Letter not found'): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Not found</title>
    <style>
      body { font-family: "Segoe UI", system-ui, sans-serif; margin: 48px auto; width: min(560px, calc(100% - 32px)); }
      a { color: #0b5d1e; }
    </style>
  </head>
  <body>
    <h1>Not found</h1>
    <p>${escapeHtml(message)}</p>
    <p><a href="/">Back to letters</a></p>
  </body>
</html>`
}
