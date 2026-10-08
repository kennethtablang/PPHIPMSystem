// Shared rules for showing a Purchase Request exactly as it prints on the
// Provincial Government's Appendix 47 form, so the screen and the paper copy
// can be compared line for line. Keep in step with ExportPurchaseRequestAsync
// (ReportExportService.cs) on the server.

// Unit abbreviations used on the paper form ("PCS", "KGS", "BOT", ...).
export function formUnit(unit) {
  const u = (unit ?? '').trim().toLowerCase();
  return { pc: 'PCS', ream: 'REAMS', kg: 'KGS', bottle: 'BOT', gallon: 'GAL' }[u] ?? u.toUpperCase();
}

const byText = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' });

// Groups PR lines by category, categories and items both alphabetical, with
// item numbers running on across groups (1, 2, 3 ... as on the form).
// `category` and `name` read those values off a line.
export function groupPrLines(lines, category, name) {
  const map = new Map();
  lines.forEach(l => {
    const key = (category(l) || 'Uncategorized').trim();
    const k = [...map.keys()].find(x => byText(x, key) === 0) ?? key;
    map.set(k, [...(map.get(k) ?? []), l]);
  });
  let no = 0;
  return [...map.entries()]
    .sort(([a], [b]) => byText(a, b))
    .map(([cat, list]) => ({
      category: cat,
      lines: [...list].sort((a, b) => byText(name(a) ?? '', name(b) ?? '')).map(line => ({ line, itemNo: ++no })),
    }));
}

export const peso = n => Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
