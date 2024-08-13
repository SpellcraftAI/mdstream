import type { Renderer } from "../types"
import { createParser } from "../parser"
import { Token } from "../tokens"

import { serializeAttr } from "./utils"
import { MarkdownStream } from "./stream"
import { chalk, ColorSupportLevel, setColorLevel } from "../chalk"

export function labelToken(type: Token): typeof TOKEN_LABEL[Token] {
  if (!(type in TOKEN_LABEL)) {
    throw new Error(`Unknown token type: ${type}`)
  }

  return TOKEN_LABEL[type]
}

export interface LogRendererOptions {
  render?: (chunk: string) => void;
}


export const createLogRenderer = ({ render = console.log }: LogRendererOptions = {}): Renderer<undefined> => ({
  data: undefined,
  addToken: (_, type) => {
    render?.(chalk("ADDTOKEN", ["dim"]))
    render?.(" ")
    render?.(labelToken(type))
    render?.("\n")
  },
  endToken: (_, type) => {
    render?.(chalk("ENDTOKEN", ["dim"]))
    render?.(" ")
    render?.(labelToken(type))
    render?.("\n")
  },
  addText:  (_, text) => {
    render?.(chalk("ADDTEXT", ["dim"]))
    render?.(" ")
    render?.(JSON.stringify(text))
    render?.("\n")
  },
  setAttr:  (_, type, value) => {
    render?.(chalk("SETATTR", ["dim"]))
    render?.(" ")
    render?.(serializeAttr(type))
    render?.(" ")
    render?.(value)
    render?.("\n")
  },
})

export class MarkdownLogStream extends MarkdownStream {
  constructor(level: ColorSupportLevel) {
    const ENCODER = new TextEncoder()
    setColorLevel(level)
    
    super({
      start: (controller) => {
        const renderer = createLogRenderer({
          render: (chunk) => controller.enqueue(ENCODER.encode(chunk)),
        })

        return createParser(renderer)
      }
    })
  }
}


const TOKEN_LABEL: Readonly<Record<Token, string>> = {
  [Token.DOCUMENT]: "Document",
  [Token.PARAGRAPH]: "Paragraph",
  [Token.HEADING_1]: "Heading1",
  [Token.HEADING_2]: "Heading2",
  [Token.HEADING_3]: "Heading3",
  [Token.HEADING_4]: "Heading4",
  [Token.HEADING_5]: "Heading5",
  [Token.HEADING_6]: "Heading6",
  [Token.CODE_BLOCK]: "CodeBlock",
  [Token.CODE_FENCE]: "CodeFence",
  [Token.CODE_INLINE]: "CodeInline",
  [Token.ITALIC_AST]: "ItalicAst",
  [Token.ITALIC_UND]: "ItalicUnd",
  [Token.STRONG_AST]: "StrongAst",
  [Token.STRONG_UND]: "StrongUnd",
  [Token.STRIKE]: "Strike",
  [Token.LINK]: "Link",
  [Token.RAW_URL]: "RawUrl",
  [Token.IMAGE]: "Image",
  [Token.BLOCKQUOTE]: "Blockquote",
  [Token.LINE_BREAK]: "LineBreak",
  [Token.RULE]: "Rule",
  [Token.LIST_UNORDERED]: "ListUnordered",
  [Token.LIST_ORDERED]: "ListOrdered",
  [Token.LIST_ITEM]: "ListItem",
  [Token.CHECKBOX]: "Checkbox",
  [Token.MAYBE_URL]: "MaybeUrl",
  [Token.MAYBE_TASK]: "MaybeTask"
} as const
