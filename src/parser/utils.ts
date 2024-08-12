/**
 * Checks if a character code is for an ASCII digit (0-9, range 48-57).
 * 
 * @param charCode The character code of the character.
 */
export function isDigit(charCode: number): boolean {
  /** 
   * Negligible performance difference between comparison and switch/bitwise.
   * Possible this pattern be better optimized by JIT compiler anyway.
   * 
   * @see https://jsperf.app/nitumi/2
   */
  return charCode >= 48 && charCode <= 57
}