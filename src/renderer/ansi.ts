import type { Renderer } from "../types"
import { Attr, Token } from "../tokens"
import { createParser } from "../parser"
import { labelToken, MarkdownStream } from "../renderer"
import { chalk, getStyleTags, setColorLevel, type AnsiPair, type AnsiStyle, type ColorSupportLevel } from "../chalk"
import { debugLog } from "../log"
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
  [Token.CODE_BLOCK]: [],
  [Token.CODE_FENCE]: [],
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

const wrapLinesWithStyles = (text: string, activeStyles: AnsiPair[]) => {
  const lines = text.split("\n")
  if (lines.length > 1) {
    const openTags = activeStyles.map(({ open }) => open).join("")
    text = lines.join("\n" + openTags)
  }

  return text
}

export function createANSIRenderer({ render, level }: ANSIRendererOptions = {}): Renderer<undefined> {
  setColorLevel(level)

  let firstToken = true
  let listLevel = 0
  let prefix = ""
  let suffix = ""

  let padding: Padding
  const activeStyles: AnsiPair[] = []

  return {
    addToken: (_, token, attrs) => {
      debugLog(chalk("ADD_TOKEN", ["dim"]), labelToken(token))

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
        // padding = new Padding(0, 0, " ")
        startingNewlines = prefixedNewline.repeat(2)
        
        const lang = attrs?.[Attr.LANG] ?? ""
        prefix = " ".repeat(listLevel * 2) + chalk(`\`\`\`${lang}`, ["dim"]) + "\n"
        suffix = "\n" + " ".repeat(listLevel * 2) + chalk("```", ["dim"])
        break
      case Token.LIST_UNORDERED:
      case Token.LIST_ORDERED:
        startingNewlines = prefixedNewline
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
        const tags = getStyleTags(styles)
        render?.(tags.open)
        activeStyles.push(tags)
      }

      render?.(prefix)
      prefix = ""
    },
    endToken: (_, token) => {
      debugLog(chalk("END_TOKEN", ["dim"]), labelToken(token))

      switch (token) {
      case Token.LIST_ORDERED:
      case Token.LIST_UNORDERED:
        listLevel -= 1
        break

      // case Token.CODE_BLOCK:
      // case Token.CODE_FENCE:
      //   render?.(padding.flush())
      //   break
      }

      render?.(suffix)
      suffix = ""
      
      const styles = ANSI_STYLES[token]
      if (styles) {
        const tags = getStyleTags(styles)
        activeStyles.pop()
        render?.(tags.close)
      }
    },
    addText: (_, token, text) => {
      debugLog(chalk("ADD_TEXT", ["dim"]), labelToken(token), { listLevel}, JSON.stringify(text))
      /**
       * For multiline text, we will make sure to end the ANSI sequence at the
       * end of the line, and re-start it at the beginning of the next line.
       * 
       * This is to prevent boxes or other transforms that work with newlines
       * from interrupting the multiline styling, so it's restarted each line.
       */
      // const lines = text.split("\n")
      // if (lines.length > 1) {
      //   const openTags = activeStyles.map(({ open }) => open).join("")
      //   text = lines.join("\n" + openTags)
      // }

      // switch (token) {
      // case Token.CODE_BLOCK:
      // case Token.CODE_FENCE:
      //   text = padding.processChunk(text)
      //   break
      // }

      const withStyledLines = wrapLinesWithStyles(text, activeStyles)
      render?.(withStyledLines)
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