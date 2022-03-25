export function isPositiveInteger(value: any): value is number {
  return Number.isInteger(value) && value >= 0;
}
