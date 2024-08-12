import type { Renderer } from "@/types"
import { Token } from "@/tokens"
import { createParser } from "@/parser"
import { MarkdownStream } from "@/renderer/stream"
import { serializeAttr } from "./utils"
import { labelToken } from "./log"
import chalk from "chalk"

function escapeHTML(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function escapeAttribute(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export interface HTMLRenderData {
  tagStack: string[];
  attributes: Record<string, string>;

  firstTextChunk: boolean;
  lastTagClosed: boolean;
}

export interface HTMLRenderOptions {
  render?: (chunk: string) => void;
}

const SELF_CLOSING_TAGS = new Set(["br", "hr", "img", "input"])

export function createHTMLRenderer({ render }: HTMLRenderOptions = {}): Renderer<HTMLRenderData> {
  return {
    addToken: (data, type) => {
      console.log(chalk.dim("ADDTOKEN"), labelToken(type))
      const tag = getTagForToken(type)
      const openTag = `<${tag}`
      
      if (!data.lastTagClosed) {
        render?.(">")
        data.lastTagClosed = true
      }
      
      render?.(openTag)

      data.lastTagClosed = false
      data.firstTextChunk = true
      data.attributes = {}
    },
    setAttr: (data, type, value) => {
      // console.log(chalk.dim("SETATTR"), serializeAttr(type), value)
      // console.log(data.attributes)
      data.attributes[serializeAttr(type)] = escapeAttribute(value)
    },
    addText: (data, text) => {
      // console.log(chalk.dim("ADDTEXT"), text)
      if (data.firstTextChunk) {
        const attrs = Object.entries(data.attributes)
          .map(([key, value]) => ` ${key}="${value}"`)
          .join("")

        render?.(attrs)
      
        if (!data.lastTagClosed) {
          render?.(">")
          data.lastTagClosed = true
        }

        data.firstTextChunk = false
      }

      render?.(escapeHTML(text))
    },
    endToken: (_, type) => {
      console.log(chalk.dim("ENDTOKEN"), labelToken(type))

      const tag = getTagForToken(type)
      const closeTag =
        SELF_CLOSING_TAGS.has(tag)
          ? ""
          : `</${tag}>`

      render?.(closeTag)
    },
    data: {
      tagStack: [],
      attributes: {},

      firstTextChunk: true,
      lastTagClosed: true,
    },
  }
}

function getTagForToken(type: Token) {
  switch (type) {
  case Token.DOCUMENT: return "html"
  case Token.PARAGRAPH: return "p"
  case Token.HEADING_1: return "h1"
  case Token.HEADING_2: return "h2"
  case Token.HEADING_3: return "h3"
  case Token.HEADING_4: return "h4"
  case Token.HEADING_5: return "h5"
  case Token.HEADING_6: return "h6"
  case Token.BLOCKQUOTE: return "blockquote"
  case Token.CHECKBOX: return "input"
  case Token.CODE_INLINE: return "code"
  case Token.CODE_BLOCK:
  case Token.CODE_FENCE: return "pre"
  case Token.LINE_BREAK: return "br"
  case Token.LIST_UNORDERED: return "ul"
  case Token.LIST_ORDERED: return "ol"
  case Token.LIST_ITEM: return "li"
  case Token.STRONG_AST:
  case Token.STRONG_UND: return "strong"
  case Token.ITALIC_AST:
  case Token.ITALIC_UND: return "em"
  case Token.STRIKE: return "s"
  case Token.LINK:
  case Token.RAW_URL: return "a"
  case Token.IMAGE: return "img"
  case Token.RULE: return "hr"
  case Token.LINE_BREAK: return "br"
  default:
    throw new Error(`No tag for token: ${labelToken(type)}`)
  }
}

export class MarkdownHTMLStream extends MarkdownStream<HTMLRenderData> {
  constructor() {
    const ENCODER = new TextEncoder()
    
    super({
      start: (controller) => {
        const renderer = createHTMLRenderer({
          render: (chunk) => controller.enqueue(ENCODER.encode(chunk)),
        })

        return createParser(renderer)
      }
    })
  }
}

// const readme = Bun.file("readme.md")
// const text = await new Response(readme.stream().pipeThrough(new MarkdownHTMLStream())).text()
// console.log(text)

// Bun.serve({
//   async fetch (request) {
//     console.log(request)
//     return new Response(
//       text , {
//         headers: {
//           "Content-Type": "text/html",
//         }
//       })
//   }
// })