export function isDigit(charcode: number): boolean {
  switch (charcode) {
  case 48: case 49: case 50: case 51: case 52:
  case 53: case 54: case 55: case 56: case 57:
    return true
  default:
    return false
  }
}