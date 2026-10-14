import { LETTERHEAD } from './letterhead'
import type { Endorsement } from './schemas'

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderTable(section: Endorsement['sections'][number]): string {
  const rows = section.items
    .map(
      (row) => `
        <tr>
          <td class="item">${escapeHtml(row.item)}</td>
          <td>${escapeHtml(row.inQty)}</td>
          <td>${escapeHtml(row.used)}</td>
          <td>${escapeHtml(row.outQty)}</td>
          <td class="notes">${escapeHtml(row.notes)}</td>
        </tr>`,
    )
    .join('')

  return `
    <h3 class="section-title">${escapeHtml(section.name)}</h3>
    <table class="inventory">
      <thead>
        <tr>
          <th class="item">ITEM</th>
          <th>IN</th>
          <th>Used</th>
          <th>OUT</th>
          <th>NOTES</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

export function renderLetterMarkup(letter: Endorsement): string {
  return `
    <article class="page">
      <div class="watermark" aria-hidden="true"></div>
      <header class="letterhead">
        <img class="seal left" src="/lgu.png" alt="Municipality of Magsaysay seal" />
        <div class="agency">
          <p>${LETTERHEAD.republic}</p>
          <p>${LETTERHEAD.province}</p>
          <p class="municipality">${LETTERHEAD.municipality}</p>
          <p class="council">${LETTERHEAD.council}</p>
          <p class="office">${LETTERHEAD.office}</p>
        </div>
        <img class="seal right" src="/mdrrmo.png" alt="MDRRMO seal" />
      </header>
      <div class="rule"></div>
      <section class="meta">
        <h1>${escapeHtml(letter.title)}</h1>
        <p>${escapeHtml(letter.team)}</p>
        <p>${escapeHtml(letter.date)}</p>
        <p>${escapeHtml(letter.time)}</p>
      </section>
      ${letter.sections.map(renderTable).join('')}
      <section class="signs">
        <div>
          <p class="label">Prepared by:</p>
          <p class="name">${escapeHtml(letter.preparedBy.name)}</p>
          <p>${escapeHtml(letter.preparedBy.position)}</p>
        </div>
        <div>
          <p class="label">Received by:</p>
          <p class="name">${escapeHtml(letter.receivedBy.name)}</p>
          <p>${escapeHtml(letter.receivedBy.position)}</p>
        </div>
      </section>
      <footer class="letter-footer">
        <div class="rule"></div>
        <p class="slogan">${LETTERHEAD.slogan}</p>
        <div class="contacts">
          <div>
            ${LETTERHEAD.addressLines.map((line) => `<p>${line}</p>`).join('')}
          </div>
          <div class="right">
            <p>Email: ${LETTERHEAD.email}</p>
            <p>Mobile No: ${LETTERHEAD.mobile}</p>
          </div>
        </div>
      </footer>
    </article>`
}

export const letterStyles = `
  :root {
    --green: ${LETTERHEAD.accent};
    --ink: #111;
    --line: #1a1a1a;
  }
  .sheet {
    background: #d7d7d7;
    padding: 24px 16px 48px;
  }
  .page {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 11mm 13mm 14mm;
    background: #fff;
    color: var(--ink);
    box-sizing: border-box;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
    font-family: "Times New Roman", Times, Georgia, serif;
  }
  .watermark {
    position: absolute;
    inset: 18% 12% 22%;
    background: url("/mdrrmo.png") center / contain no-repeat;
    opacity: 0.07;
    pointer-events: none;
  }
  .letterhead,
  .meta,
  .inventory,
  .signs,
  .letter-footer,
  .section-title {
    position: relative;
    z-index: 1;
  }
  .letterhead {
    display: grid;
    grid-template-columns: 18mm 1fr 18mm;
    gap: 8px;
    align-items: center;
  }
  .seal {
    width: 18mm;
    height: 18mm;
    object-fit: contain;
  }
  .agency {
    text-align: center;
    line-height: 1.25;
  }
  .agency p {
    margin: 0;
    font-size: 10.5pt;
  }
  .agency .municipality {
    font-weight: 700;
    letter-spacing: 0.4px;
    margin-top: 1px;
  }
  .agency .council {
    font-weight: 700;
    font-size: 10.2pt;
    letter-spacing: 0;
    margin-top: 2px;
    white-space: nowrap;
  }
  .agency .office {
    font-size: 10pt;
  }
  .rule {
    height: 2.4px;
    background: var(--green);
    margin: 8px 0 10px;
  }
  .meta {
    text-align: center;
    margin-bottom: 8px;
  }
  .meta h1 {
    margin: 0 0 6px;
    font-size: 13.5pt;
    font-weight: 700;
  }
  .meta p {
    margin: 0;
    font-size: 12pt;
    line-height: 1.35;
  }
  .section-title {
    text-align: center;
    font-size: 12pt;
    margin: 10px 0 6px;
  }
  .inventory {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 9.5pt;
    background: rgba(255, 255, 255, 0.72);
  }
  .inventory th,
  .inventory td {
    border: 1px solid var(--line);
    padding: 2px 5px;
    vertical-align: middle;
  }
  .inventory th {
    font-weight: 700;
    text-align: center;
  }
  .inventory td {
    text-align: center;
  }
  .inventory .item {
    width: 42%;
    text-align: left;
  }
  .inventory th.item {
    text-align: center;
  }
  .inventory .notes {
    width: 18%;
    text-align: left;
  }
  .signs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    text-align: center;
    margin: 18px 0 16px;
    font-size: 12pt;
  }
  .signs .label {
    margin: 0 0 18px;
  }
  .signs .name {
    margin: 0;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .signs p {
    margin: 2px 0 0;
  }
  .letter-footer {
    margin-top: auto;
  }
  .slogan {
    text-align: center;
    font-weight: 700;
    font-size: 13pt;
    margin: 8px 0 10px;
  }
  .contacts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    font-size: 8.5pt;
    line-height: 1.35;
  }
  .contacts p {
    margin: 0;
  }
  .contacts .right {
    text-align: right;
  }
  @page {
    size: A4;
    margin: 0;
  }
  @media print {
    .sheet {
      background: #fff;
      padding: 0;
    }
    .page {
      box-shadow: none;
      margin: 0;
    }
  }
`
