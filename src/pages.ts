import { escapeHtml, letterStyles, renderLetterMarkup } from './letter-html'
import { TEAM_POSITIONS, type Endorsement, type EndorsementInput } from './schemas'
import { blankTemplate } from './seed'

const uiStyles = `
  :root {
    --green: #0b5d1e;
    --accent: #00a651;
    --bg: #eef2ea;
    --card: #fff;
    --ink: #142016;
    --muted: #5b675d;
    --line: #d5ddd4;
    --danger: #b42318;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Segoe UI", system-ui, sans-serif;
    background: var(--bg);
    color: var(--ink);
  }
  a { color: var(--green); }
  .nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 14px 22px;
    background: #103816;
    color: #fff;
  }
  .nav strong { letter-spacing: 0.2px; }
  .nav-links { display: flex; gap: 14px; flex-wrap: wrap; }
  .nav a { color: #dff5e4; text-decoration: none; font-size: 14px; }
  .wrap { width: min(1100px, calc(100% - 32px)); margin: 24px auto 48px; }
  .card {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 8px 24px rgba(20, 32, 22, 0.06);
  }
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }
  h1 { margin: 0 0 6px; font-size: 26px; }
  .muted { color: var(--muted); margin: 0; }
  table.data { width: 100%; border-collapse: collapse; }
  table.data th, table.data td {
    text-align: left;
    padding: 10px 8px;
    border-bottom: 1px solid var(--line);
    font-size: 14px;
  }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .btn, button, input[type="submit"] {
    appearance: none;
    border: 0;
    border-radius: 8px;
    padding: 8px 12px;
    background: var(--green);
    color: #fff;
    text-decoration: none;
    font: inherit;
    cursor: pointer;
    display: inline-block;
  }
  .btn.secondary, button.secondary { background: #3d5341; }
  .btn.ghost, button.ghost { background: #e6eee6; color: var(--ink); }
  .btn.danger, button.danger { background: var(--danger); }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
  .field.full { grid-column: 1 / -1; }
  label { font-size: 13px; font-weight: 600; }
  input, textarea, select {
    border: 1px solid #c8d2c8;
    border-radius: 8px;
    padding: 9px 10px;
    font: inherit;
    background: #fff;
  }
  .section-card {
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 12px;
    margin: 12px 0;
    background: #fbfdfb;
  }
  .item-grid {
    display: grid;
    grid-template-columns: 2.2fr 0.7fr 0.7fr 0.7fr 1.3fr auto;
    gap: 8px;
    margin-bottom: 8px;
    align-items: center;
  }
  .banner {
    background: #fff7d6;
    border: 1px solid #ead48a;
    color: #5c4d12;
    padding: 10px 12px;
    border-radius: 10px;
    margin-bottom: 16px;
    font-size: 13px;
  }
  .error {
    background: #fee4e2;
    color: #7a271a;
    border: 1px solid #f3b4ad;
    padding: 10px 12px;
    border-radius: 10px;
    display: none;
    margin-bottom: 12px;
  }
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
  .preview-bar a, .preview-bar button {
    background: #1f7a38;
  }
  @media (max-width: 800px) {
    .grid, .item-grid { grid-template-columns: 1fr; }
  }
  @media print {
    .preview-bar { display: none; }
  }
`

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>${uiStyles}</style>
  </head>
  <body>
    <nav class="nav">
      <strong>MDRRMO Endorsement Letters</strong>
      <div class="nav-links">
        <a href="/">Letters</a>
        <a href="/letters/new">New letter</a>
        <a href="/docs">Swagger</a>
        <a href="/doc">OpenAPI JSON</a>
      </div>
    </nav>
    <main class="wrap">${body}</main>
  </body>
</html>`
}

export function renderHomePage(letters: Endorsement[]): string {
  const rows = letters
    .map(
      (letter) => `
      <tr>
        <td>${escapeHtml(letter.team)}</td>
        <td>${escapeHtml(letter.date)}</td>
        <td>${escapeHtml(letter.title)}</td>
        <td>
          <div class="actions">
            <a class="btn" href="/letters/${encodeURIComponent(letter.id)}">View</a>
            <a class="btn secondary" href="/letters/${encodeURIComponent(letter.id)}/edit">Edit</a>
            <a class="btn ghost" href="/api/endorsements/${encodeURIComponent(letter.id)}/download">PDF</a>
            <form method="post" action="/letters/${encodeURIComponent(letter.id)}/delete" onsubmit="return confirm('Delete this letter?')">
              <button class="danger" type="submit">Delete</button>
            </form>
          </div>
        </td>
      </tr>`,
    )
    .join('')

  return layout(
    'Endorsement Letters',
    `
    <div class="toolbar">
      <div>
        <h1>Endorsement letters</h1>
        <p class="muted">Create, preview, and download A4 PDFs without a separate frontend.</p>
      </div>
      <a class="btn" href="/letters/new">Create letter</a>
    </div>
    <p class="banner">Letters are saved to the Neon database. Create, edit, and download from this page or from <a href="/app.html">/app.html</a>.</p>
    <div class="card">
      ${
        letters.length === 0
          ? '<p class="muted">No letters yet.</p>'
          : `<table class="data">
              <thead>
                <tr><th>Team</th><th>Date</th><th>Title</th><th>Actions</th></tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>`
      }
    </div>`,
  )
}

export function renderFormPage(options: { letter?: Endorsement; initial?: EndorsementInput }): string {
  const initial = options.letter ?? options.initial ?? blankTemplate()
  const isEdit = Boolean(options.letter)
  const payload = JSON.stringify(initial).replaceAll('<', '\\u003c')

  return layout(
    isEdit ? 'Edit endorsement letter' : 'New endorsement letter',
    `
    <div class="toolbar">
      <div>
        <h1>${isEdit ? 'Edit letter' : 'New letter'}</h1>
        <p class="muted">The standard ambulance and adventure inventory is prefilled. Change quantities, notes, or add rows.</p>
      </div>
      <a class="btn ghost" href="/">Back to list</a>
    </div>
    <div class="card">
      <div id="form-error" class="error"></div>
      <form id="letter-form">
        <div class="grid">
          <div class="field full">
            <label for="title">Title</label>
            <input id="title" name="title" required />
          </div>
          <div class="field">
            <label for="team">Team</label>
            <input id="team" name="team" required />
          </div>
          <div class="field">
            <label for="date">Date</label>
            <input id="date" name="date" required />
          </div>
          <div class="field full">
            <label for="time">Time</label>
            <input id="time" name="time" required />
          </div>
        </div>
        <div id="sections"></div>
        <p class="actions">
          <button type="button" class="ghost" id="add-section">Add section</button>
          <button type="button" class="ghost" id="load-standard">Reload standard inventory</button>
        </p>
        <div class="grid">
          <div class="field">
            <label for="preparedName">Prepared by</label>
            <input id="preparedName" required />
          </div>
          <div class="field">
            <label for="preparedPosition">Prepared by position</label>
            <select id="preparedPosition" required>
              <option value="">Select position</option>
              ${TEAM_POSITIONS.map((position) => `<option value="${escapeHtml(position)}">${escapeHtml(position)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="receivedName">Received by</label>
            <input id="receivedName" required />
          </div>
          <div class="field">
            <label for="receivedPosition">Received by position</label>
            <select id="receivedPosition" required>
              <option value="">Select position</option>
              ${TEAM_POSITIONS.map((position) => `<option value="${escapeHtml(position)}">${escapeHtml(position)}</option>`).join('')}
            </select>
          </div>
        </div>
        <button type="submit">${isEdit ? 'Save changes' : 'Create letter'}</button>
      </form>
    </div>
    <script>
      const initial = ${payload};
      const isEdit = ${isEdit ? 'true' : 'false'};
      const editId = ${options.letter ? JSON.stringify(options.letter.id) : 'null'};
      const standard = ${JSON.stringify(blankTemplate().sections).replaceAll('<', '\\u003c')};
      let sections = Array.isArray(initial.sections) ? structuredClone(initial.sections) : [];

      const $ = (id) => document.getElementById(id);
      $('title').value = initial.title || '';
      $('team').value = initial.team || '';
      $('date').value = initial.date || '';
      $('time').value = initial.time || '';
      const positions = ${JSON.stringify(TEAM_POSITIONS)};
      function matchPosition(value) {
        const normalized = String(value ?? '').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
        return positions.includes(normalized) ? normalized : '';
      }
      $('preparedName').value = initial.preparedBy?.name || '';
      $('preparedPosition').value = matchPosition(initial.preparedBy?.position);
      $('receivedName').value = initial.receivedBy?.name || '';
      $('receivedPosition').value = matchPosition(initial.receivedBy?.position);

      function emptyItem() {
        return { item: '', inQty: '', used: '', outQty: '', notes: '' };
      }

      function render() {
        const root = $('sections');
        root.innerHTML = sections.map((section, sIdx) => {
          const items = section.items.map((item, iIdx) => \`
            <div class="item-grid">
              <input data-s="\${sIdx}" data-i="\${iIdx}" data-k="item" placeholder="Item" value="\${esc(item.item)}" />
              <input data-s="\${sIdx}" data-i="\${iIdx}" data-k="inQty" placeholder="IN" value="\${esc(item.inQty)}" />
              <input data-s="\${sIdx}" data-i="\${iIdx}" data-k="used" placeholder="Used" value="\${esc(item.used)}" />
              <input data-s="\${sIdx}" data-i="\${iIdx}" data-k="outQty" placeholder="OUT" value="\${esc(item.outQty)}" />
              <input data-s="\${sIdx}" data-i="\${iIdx}" data-k="notes" placeholder="Notes" value="\${esc(item.notes)}" />
              <button type="button" class="danger" data-remove-item="\${sIdx}:\${iIdx}">X</button>
            </div>
          \`).join('');
          return \`
            <section class="section-card">
              <div class="toolbar">
                <input data-section-name="\${sIdx}" value="\${esc(section.name)}" />
                <button type="button" class="danger" data-remove-section="\${sIdx}">Remove section</button>
              </div>
              \${items}
              <button type="button" class="ghost" data-add-item="\${sIdx}">Add item</button>
            </section>
          \`;
        }).join('');
      }

      function esc(value) {
        return String(value ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
      }

      function readInputs() {
        document.querySelectorAll('[data-section-name]').forEach((el) => {
          sections[Number(el.dataset.sectionName)].name = el.value;
        });
        document.querySelectorAll('[data-s][data-i][data-k]').forEach((el) => {
          sections[Number(el.dataset.s)].items[Number(el.dataset.i)][el.dataset.k] = el.value;
        });
      }

      $('sections').addEventListener('input', () => {
        readInputs();
      });

      $('sections').addEventListener('click', (event) => {
        const t = event.target;
        if (!(t instanceof HTMLElement)) return;
        const addItem = t.closest('[data-add-item]')?.getAttribute('data-add-item');
        const removeItem = t.closest('[data-remove-item]')?.getAttribute('data-remove-item');
        const removeSection = t.closest('[data-remove-section]')?.getAttribute('data-remove-section');
        if (!addItem && !removeItem && !removeSection) return;

        readInputs();
        if (addItem) {
          sections[Number(addItem)].items.push(emptyItem());
        }
        if (removeItem) {
          const [s, i] = removeItem.split(':').map(Number);
          if (sections[s].items.length > 1) sections[s].items.splice(i, 1);
        }
        if (removeSection && sections.length > 1) {
          sections.splice(Number(removeSection), 1);
        }
        render();
      });

      $('add-section').addEventListener('click', () => {
        readInputs();
        sections.push({ name: 'New section', items: [emptyItem()] });
        render();
      });

      $('load-standard').addEventListener('click', () => {
        sections = structuredClone(standard);
        render();
      });

      $('letter-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        readInputs();
        const error = $('form-error');
        error.style.display = 'none';
        const payload = {
          title: $('title').value.trim(),
          team: $('team').value.trim(),
          date: $('date').value.trim(),
          time: $('time').value.trim(),
          sections,
          preparedBy: {
            name: $('preparedName').value.trim(),
            position: $('preparedPosition').value.trim(),
          },
          receivedBy: {
            name: $('receivedName').value.trim(),
            position: $('receivedPosition').value.trim(),
          },
        };
        const res = await fetch(isEdit ? '/api/endorsements/' + editId : '/api/endorsements', {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          error.style.display = 'block';
          error.textContent = body.error || 'Unable to save letter';
          return;
        }
        location.href = '/letters/' + body.data.id;
      });

      render();
    </script>`,
  )
}

export function renderPreviewPage(letter: Endorsement): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(letter.team)} endorsement</title>
    <style>
      ${uiStyles}
      ${letterStyles}
      body { background: #d7d7d7; }
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
        <a class="btn secondary" href="/letters/${encodeURIComponent(letter.id)}/edit">Edit</a>
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
  return layout(
    'Not found',
    `<div class="card"><h1>Not found</h1><p class="muted">${escapeHtml(message)}</p><p><a href="/">Back to letters</a></p></div>`,
  )
}
