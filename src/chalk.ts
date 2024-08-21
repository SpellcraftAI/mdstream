import ansiStyles, { type ColorName, type ModifierName } from "ansi-styles"
import supportsColor from "supports-color"

// export type ColorSupportLevel = 0 | 1 | 2 | 3;

export enum ColorSupportLevel {
  None = 0,
  Colors16 = 1,
  Colors256 = 2,
  TrueColor = 3,
}

function getColorLevel(): ColorSupportLevel {
  const support = supportsColor.stdout
  if (support && support.has16m) return 3
  if (support && support.has256) return 2
  if (support && support.hasBasic) return 1
  return 0
}


/**
 * The current color level support for the process.
 */
let level: ColorSupportLevel = getColorLevel()

/**
 * Change the color level support for the process.
 */
export const setColorLevel = (newLevel?: ColorSupportLevel): ColorSupportLevel => 
  level = newLevel ?? getColorLevel()

export type RGB = [number, number, number];
export type AnsiStyle = (ModifierName | ColorName) & string;

export interface ChalkOptions {
  level?: ColorSupportLevel;
  color?: string | RGB;
  bgColor?: string | RGB;
}

function applyColor(color: string | RGB, isBackground: boolean, colorLevel: ColorSupportLevel = level): string {
  const colorFunc = isBackground ? ansiStyles.bgColor : ansiStyles.color

  if (typeof color === "string") {
    // Assume it's a hex color
    if (colorLevel === 3) return colorFunc.ansi16m(...ansiStyles.hexToRgb(color))
    if (colorLevel === 2) return colorFunc.ansi256(ansiStyles.hexToAnsi256(color))
    return colorFunc.ansi(ansiStyles.hexToAnsi(color))
  } else {
    // It's an RGB array
    if (colorLevel === 3) return colorFunc.ansi16m(...color)
    if (colorLevel === 2) return colorFunc.ansi256(ansiStyles.rgbToAnsi256(...color))
    return colorFunc.ansi(ansiStyles.rgbToAnsi(...color))
  }
}

export function chalk(text: string, styles: AnsiStyle[] = [], options: ChalkOptions = { level }): string {
  const colorLevel = options?.level ?? level

  if (colorLevel === 0) return text

  let openTags = styles.map(style => ansiStyles[style].open).join("")
  let closeTags = styles.map(style => ansiStyles[style].close).reverse().join("")

  if (options?.color) {
    openTags += applyColor(options.color, false, colorLevel)
    closeTags = ansiStyles.color.close + closeTags
  }

  if (options?.bgColor) {
    openTags += applyColor(options.bgColor, true, colorLevel)
    closeTags = ansiStyles.bgColor.close + closeTags
  }

  return `${openTags}${text}${closeTags}`
}

export type AnsiPair = { open: string; close: string };

export function getStyleTags(styles: AnsiStyle[], options: ChalkOptions = { level }): AnsiPair {
  const colorLevel = options?.level ?? level

  if (colorLevel === 0) {
    return { open: "", close: "" }
  }

  let openTags = styles.map(style => ansiStyles[style].open).join("")
  let closeTags = styles.map(style => ansiStyles[style].close).reverse().join("")

  if (options?.color) {
    openTags += applyColor(options.color, false, colorLevel)
    closeTags = ansiStyles.color.close + closeTags
  }

  if (options?.bgColor) {
    openTags += applyColor(options.bgColor, true, colorLevel)
    closeTags = ansiStyles.bgColor.close + closeTags
  }

  return { open: openTags, close: closeTags }
}