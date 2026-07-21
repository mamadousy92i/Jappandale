const numberFormatter = new Intl.NumberFormat("fr-FR")

/** Formate un montant en francs CFA, ex. 520000 → « 520 000 F CFA ». */
export function formatFcfa(amount: number): string {
  return `${numberFormatter.format(amount)} F CFA`
}
