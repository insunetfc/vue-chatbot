// utils/parseTextTable.js
export function parseTextTableToHTML(raw) {
  const text = raw.trim();

  // 1) Markdown 파이프 테이블 감지
  const looksLikeMdTable =
    /\n?\|.*\|\n\|[:\-|\s]+\|\n(?:\|.*\|\n?)+/.test('\n' + text);
  if (looksLikeMdTable) return mdPipeToHTML(text);

  // 2) TSV/CSV 감지
  const hasTabs = /\t/.test(text);
  const hasCommas = /,/.test(text);
  if (hasTabs || hasCommas) {
    const delimiter = hasTabs ? '\t' : ',';
    return delimitedToHTML(text, delimiter);
  }

  // 3) 공백 정렬 표(모노스페이스로 정렬된 경우)는 프리텍스트로 반환
  return null; // 표 아님 → 일반 텍스트로 처리
}

function mdPipeToHTML(text) {
  const lines = text
    .split('\n')
    .filter(l => l.trim().startsWith('|') && l.trim().endsWith('|'));

  if (lines.length < 2) return null;

  const header = splitPipes(lines[0]);
  const alignLine = splitPipes(lines[1]);
  const bodyLines = lines.slice(2).map(splitPipes);

  const aligns = alignLine.map(a => {
    const c = a.trim();
    if (c.startsWith(':') && c.endsWith(':')) return 'center';
    if (c.endsWith(':')) return 'right';
    return 'left';
  });

  return buildTableHTML(header, bodyLines, aligns);
}

function splitPipes(line) {
  // 좌우 파이프 제거 후, 이스케이프된 \| 보호
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map(c => c.replace(/\\\|/g, '|').trim());
}

function delimitedToHTML(text, delimiter) {
  const rows = text
    .split('\n')
    .map(r => r.trim())
    .filter(Boolean)
    .map(r => splitCSVLike(r, delimiter));

  if (rows.length === 0) return null;

  // 첫 줄을 헤더로 가정 (모든 줄의 컬럼수 동일 시)
  const allSameLen = rows.every(r => r.length === rows[0].length);
  if (!allSameLen) return null; // 열 개수가 다르면 표로 처리하지 않음
  const header = rows[0];
  const body = rows.slice(1);

  // 숫자 비율로 정렬 방향 추정
  const aligns = header.map((_, colIdx) => {
    const numericCount = body.reduce((acc, r) => acc + (isNumericLike(r[colIdx]) ? 1 : 0), 0);
    return numericCount >= Math.ceil(body.length * 0.6) ? 'right' : 'left';
  });

  return buildTableHTML(header, body, aligns);
}

function splitCSVLike(line, delimiter) {
  // 간단한 CSV/TSV 파서 (따옴표 보호)
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' ) {
      // 이스케이프된 "" 처리
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === delimiter && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function isNumericLike(s) {
  if (s == null) return false;
  const t = String(s).replace(/[,%\s₩$€£]/g, '');
  return t !== '' && !isNaN(Number(t));
}

function buildTableHTML(header, bodyRows, aligns = []) {
  const ths = header.map((h, i) => `<th scope="col" data-align="${aligns[i]||'left'}">${escapeHTML(h)}</th>`).join('');
  const trs = bodyRows.map(r => {
    const tds = r.map((c, i) =>
      `<td data-align="${aligns[i]||'left'}">${escapeHTML(c)}</td>`
    ).join('');
    return `<tr>${tds}</tr>`;
  }).join('');

  return `
  <div class="bot-table-wrap" role="region" aria-label="데이터 표" tabindex="0">
    <table class="bot-table" role="table">
      <thead><tr>${ths}</tr></thead>
      <tbody>${trs}</tbody>
    </table>
  </div>`;
}

function escapeHTML(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
