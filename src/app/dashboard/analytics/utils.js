export default function getPieces(sDetail) {
  if (!sDetail) return [];
  const p = sDetail.pieces;
  if (Array.isArray(p)) return p;
  if (p && Array.isArray(p.pieces)) return p.pieces;
  return [];
}