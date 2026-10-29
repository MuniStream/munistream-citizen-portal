/**
 * What a trámite costs, written the same way everywhere it appears.
 *
 * The amount is stored as a plain number of pesos (the figure in the Ley
 * Federal de Derechos). Shown raw it reads as a serial number — "2912" next to
 * "21 días hábiles" is not a price — so it always carries its currency.
 */
export function formatCost(cost: unknown, locale = 'es-MX'): string {
  const amount = typeof cost === 'number' ? cost : Number(cost);
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return `$${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
}
