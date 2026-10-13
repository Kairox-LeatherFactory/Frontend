// Paging helpers shared by the role dashboards.

import { toNum } from './format';

// Every row of a paged list: the first page gives the total, the rest load
// four at a time. `fetchPage(offset, limit)` resolves to { items | pieces, total }.
export async function fetchAllPages(fetchPage, limit = 200) {
  const rowsOf = (page) => (Array.isArray(page?.items) ? page.items : Array.isArray(page?.pieces) ? page.pieces : []);
  const first = await fetchPage(0, limit);
  const rows = [...rowsOf(first)];
  const total = toNum(first?.total) ?? rows.length;
  const offsets = [];
  for (let offset = limit; offset < total; offset += limit) offsets.push(offset);
  for (let i = 0; i < offsets.length; i += 4) {
    const pages = await Promise.all(offsets.slice(i, i + 4).map((offset) => fetchPage(offset, limit)));
    pages.forEach((page) => rows.push(...rowsOf(page)));
  }
  return rows;
}

// `task` over every item, `size` at a time; results in the items' order.
export async function inBatches(items, size, task) {
  const results = [];
  for (let i = 0; i < items.length; i += size) {
    results.push(...(await Promise.all(items.slice(i, i + size).map(task))));
  }
  return results;
}
