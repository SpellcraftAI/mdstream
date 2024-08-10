import type { Renderer } from "@/types"
import { Token } from "@/tokens"
import { serializeAttr } from "./utils"

export function labelToken(type: Token): typeof TOKEN_LABEL[Token] {
  return TOKEN_LABEL[type]
}

export const LogRenderer: Renderer<undefined> = {
  data: undefined,
  addToken: (_, type) => {
    console.log("addToken:", labelToken(type))
  },
  endToken: (_) => {
    console.log("endToken")
  },
  addText:  (_, text) => {
    console.log("addText: \"%s\"", text)
  },
  setAttr:  (_, type, value) => {
    console.log("setAttr: %s=\"%s\"", serializeAttr(type), value)
  },
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
