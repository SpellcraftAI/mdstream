import type { Renderer } from "../types"
import { Token } from "../tokens"
import { createParser } from "../parser"
import { MarkdownStream } from "../renderer"
import { getStyleTags, setColorLevel, type AnsiStyle, type ColorSupportLevel } from "../chalk"
import { Padding } from "../utils/PaddingStream"

const ANSI_STYLES: Partial<Record<Token, AnsiStyle[]>> = {
  [Token.DOCUMENT]: [],
  [Token.PARAGRAPH]: [],
  [Token.HEADING_1]: ["bold"],
  [Token.HEADING_2]: ["bold"],
  [Token.HEADING_3]: ["bold"],
  [Token.HEADING_4]: ["bold"],
  [Token.HEADING_5]: ["bold"],
  [Token.HEADING_6]: ["bold"],
  [Token.BLOCKQUOTE]: ["dim"],
  [Token.CODE_INLINE]: ["inverse"],
  [Token.CODE_BLOCK]: ["inverse"],
  [Token.CODE_FENCE]: ["inverse"],
  [Token.LIST_UNORDERED]: [],
  [Token.LIST_ORDERED]: [],
  [Token.LIST_ITEM]: [],
  [Token.STRONG_AST]: ["bold"],
  [Token.STRONG_UND]: ["bold"],
  [Token.ITALIC_AST]: ["italic"],
  [Token.ITALIC_UND]: ["italic"],
  [Token.STRIKE]: ["strikethrough"],
  [Token.LINK]: ["blue", "underline"],
  [Token.RAW_URL]: ["blue", "underline"],
  [Token.IMAGE]: [],
  [Token.RULE]: ["dim"],
  [Token.LINE_BREAK]: [],
  [Token.CHECKBOX]: [],
} as const

export interface ANSIRendererOptions {
  level?: ColorSupportLevel;
  render?: (chunk: string) => void;
}

export function createANSIRenderer({ render, level }: ANSIRendererOptions = {}): Renderer<undefined> {
  setColorLevel(level)

  let firstToken = true
  let listLevel = 0
  let prefix = ""
  let suffix = ""

  let padding: Padding

  return {
    addToken: (_, token) => {
      const prefixedNewline = firstToken ? "" : "\n"
      let startingNewlines = ""

      prefix = ""
      suffix = ""
      firstToken = false
      
      switch (token) {
      case Token.DOCUMENT:
        break
      case Token.PARAGRAPH:
        startingNewlines = prefixedNewline.repeat(2)
        break
      case Token.HEADING_1:
      case Token.HEADING_2:
      case Token.HEADING_3:
      case Token.HEADING_4:
      case Token.HEADING_5:
      case Token.HEADING_6:
        startingNewlines = prefixedNewline.repeat(2)
        break
      case Token.BLOCKQUOTE:
        break
      case Token.CODE_INLINE:
        prefix = " "
        suffix = " "
        break
      case Token.CODE_BLOCK:
      case Token.CODE_FENCE:
        /**
         * Create a new padding stream for this block.
         */
        padding = new Padding(1, 1, " ")
        startingNewlines = prefixedNewline.repeat(2)
        break
      case Token.LIST_UNORDERED:
      case Token.LIST_ORDERED:
        startingNewlines = listLevel < 1 ? prefixedNewline : ""
        listLevel += 1
        break
      case Token.LIST_ITEM:
        startingNewlines = prefixedNewline
        prefix = " ".repeat(listLevel * 2) + "• "
        break
      case Token.STRONG_AST:
      case Token.STRONG_UND:
        break
      case Token.ITALIC_AST:
      case Token.ITALIC_UND:
        break
      case Token.STRIKE:
        break
      case Token.LINK:
      case Token.RAW_URL:
        break
      case Token.IMAGE:
        prefix = "[Image] "
        break
      case Token.RULE:
        startingNewlines = prefixedNewline.repeat(2)
        prefix =  "─".repeat(40)
        break
      case Token.LINE_BREAK:
        startingNewlines = prefixedNewline
        break
      case Token.CHECKBOX:
        prefix = "☐" // "✅"
        break
      }

      render?.(startingNewlines)
      const styles = ANSI_STYLES[token]
      if (styles) {
        const { open } = getStyleTags(styles)
        render?.(open)
      }
      render?.(prefix)
    },
    endToken: (_, token) => {
      switch (token) {
      case Token.LIST_ORDERED:
      case Token.LIST_UNORDERED:
        listLevel -= 1
        break

      case Token.CODE_BLOCK:
      case Token.CODE_FENCE:
        render?.(padding.flush())
        break
      }

      render?.(suffix)
      const styles = ANSI_STYLES[token]
      if (styles) {
        const { close } = getStyleTags(styles)
        render?.(close)
      }
    },
    addText: (_, token, text) => {
      switch (token) {
      case Token.CODE_BLOCK:
      case Token.CODE_FENCE:
        const padded = padding.processChunk(text)
        render?.(padded)
        break
      default:
        render?.(text)
        break
      }
    },
    setAttr: () => {
    },
    data: undefined,
  }
}


export class MarkdownANSIStream extends MarkdownStream<undefined> {
  constructor(level?: ColorSupportLevel) {
    const ENCODER = new TextEncoder()
    
    super({
      start: (controller) => {
        const renderer = createANSIRenderer({
          level,
          render: (chunk) => controller.enqueue(ENCODER.encode(chunk)),
        })

        return createParser(renderer)
      }
    })
  }
}