import chalk, { type ChalkInstance } from "chalk"
import type { Renderer } from "@/types"
import { Token } from "@/tokens"
import { createParser } from "@/parser"
import { MarkdownStream } from "@/renderer/stream"

export interface ANSIRendererData {
  buffer: string;
  prefix: string;
  styles: ChalkInstance[];
}

export interface ANSIRendererOptions {
  render?: (chunk: string) => void;
}

export function createANSIRenderer({ render }: ANSIRendererOptions = {}): Renderer<ANSIRendererData> {
  return {
    addToken: (data, type) => {
      data.prefix = ""
      
      switch (type) {
      case Token.DOCUMENT:
        break
      case Token.PARAGRAPH:
        data.prefix = "\n\n"
        break
      case Token.HEADING_1:
      case Token.HEADING_2:
      case Token.HEADING_3:
      case Token.HEADING_4:
      case Token.HEADING_5:
      case Token.HEADING_6:
        data.styles.push(chalk.bold)
        data.prefix = "\n\n"
        break
      case Token.BLOCKQUOTE:
        data.styles.push(chalk.dim)
        break
      case Token.CODE_INLINE:
        data.styles.push(chalk.bgGray.white)
        break
      case Token.CODE_BLOCK:
      case Token.CODE_FENCE:
        data.prefix = "\n\n"
        data.styles.push(chalk.bgGray.white)
        break
      case Token.LIST_UNORDERED:
      case Token.LIST_ORDERED:
        data.prefix = "\n"
        break
      case Token.LIST_ITEM:
        data.prefix = "\n • "
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
        data.prefix = chalk.magenta("[Image] ")
        break
      case Token.RULE:
        data.prefix = chalk.dim("\n\n" + "─".repeat(40))
        break
      case Token.LINE_BREAK:
        data.prefix = "\n\n"
        break
      case Token.CHECKBOX:
        data.prefix = " [ ] "
        break
      }
      
      data.buffer += data.prefix
      render?.(data.prefix)
    },
    endToken: (data) => {
      data.styles = []
    },
    addText: (data, text) => {
      for (const style of data.styles) {
        text = style(text)
      }

      data.buffer += text
      render?.(text)
    },
    setAttr: () => {
      // if (type === Attr.HREF || type === Attr.SRC) {
      //   data.buffer += chalk.blue(` (${value})`)
      // }
    },
    data: {
      buffer: "",
      prefix: "",
      styles: [],
    },
  }
}


export class MarkdownANSIStream extends MarkdownStream<ANSIRendererData> {
  constructor() {
    const ENCODER = new TextEncoder()
    
    super({
      start: (controller) => {
        const renderer = createANSIRenderer({
          render: (chunk) => controller.enqueue(ENCODER.encode(chunk)),
        })

        return createParser(renderer)
      }
    })
  }
}