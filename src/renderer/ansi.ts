import type { Renderer } from "@/types"
import { Token, Attr } from "@/tokens"
import type { ChalkInstance } from "chalk"
import chalk from "chalk"

export interface ANSIRendererData {
  nodes: Array<string>;
  index: number;
  styles: ChalkInstance[];
}

export function createANSIRenderer(): Renderer<ANSIRendererData> {
  let firstTextChunk = true
  let initialContent = ""

  return {
    addToken: (data, type) => {
      // console.log({ type: labelToken(type), data })
      data.index += 1
      initialContent = ""
      firstTextChunk = true
      
      switch (type) {
      case Token.DOCUMENT:
        break
      case Token.PARAGRAPH:
        initialContent = "\n\n"
        break
      case Token.HEADING_1:
      case Token.HEADING_2:
      case Token.HEADING_3:
      case Token.HEADING_4:
      case Token.HEADING_5:
      case Token.HEADING_6:
        data.styles.push(chalk.bold)
        initialContent = "\n"
        // data.nodes[data.index] += "\n"
        break
      case Token.BLOCKQUOTE:
        data.styles.push(chalk.dim)
        // data.nodes[data.index] += "\n  "
        break
      case Token.CODE_INLINE:
        data.styles.push(chalk.bgGray.white)
        break
      case Token.CODE_BLOCK:
      case Token.CODE_FENCE:
        data.styles.push(chalk.bgGray.white)
        // needsStartPadding = true
        break
      case Token.LIST_UNORDERED:
      case Token.LIST_ORDERED:
        initialContent = "\n\n"
        break
      case Token.LIST_ITEM:
        initialContent = "  • "
        break
      case Token.STRONG_AST:
      case Token.STRONG_UND:
        data.styles.push(chalk.bold)
        break
      case Token.ITALIC_AST:
      case Token.ITALIC_UND:
        data.styles.push(chalk.italic)
        break
      case Token.STRIKE:
        data.styles.push(chalk.strikethrough)
        break
      case Token.LINK:
      case Token.RAW_URL:
        data.styles.push(chalk.blue.underline)
        break
      case Token.IMAGE:
        initialContent = chalk.magenta("[Image]")
        break
      case Token.RULE:
        initialContent = "\n" + chalk.dim("─".repeat(40)) + "\n"
        break
      case Token.LINE_BREAK:
        initialContent = "\n"
        // needsStartPadding = true
        break
      case Token.CHECKBOX:
        initialContent += "[ ] "
        break
      }

      data.nodes[data.index] = initialContent
    },
    endToken: (data) => {
      data.styles = []
    },
    addText: (data, text) => {
      if (firstTextChunk) {
        text = data.nodes[data.index] + text
        console.log({ text, firstTextChunk})
        firstTextChunk = false
      }

      let styledText = text
      
      for (const style of data.styles) {
        styledText = style(styledText)
      }

      data.nodes[data.index] += styledText
      process.stdout.write(styledText)
    },
    setAttr: (data, type, value) => {
      if (type === Attr.HREF || type === Attr.SRC) {
        data.nodes[data.index] += chalk.blue(` (${value})`)
      }
    },
    data: {
      nodes: [""],
      index: 0,
      styles: []
    },
  }
}

export function renderANSI(renderer: Renderer<ANSIRendererData>): string {
  return renderer.data.nodes.join("").trim()
}