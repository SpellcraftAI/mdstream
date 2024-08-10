import type { Renderer, RendererAddText, RendererAddToken, RendererEndToken, RendererSetAttr } from "./renderer"
import { Token } from "./tokens";
import { attr_to_html_attr } from "./parser"

export type LoggerRendererData = undefined;

export type LoggerRenderer = Renderer<LoggerRendererData>;
export type LoggerRendererAddToken = RendererAddToken<LoggerRendererData>;
export type LoggerRendererEndToken = RendererEndToken<LoggerRendererData>;
export type LoggerRendererAddText = RendererAddText<LoggerRendererData>;
export type LoggerRendererSetAttr = RendererSetAttr<LoggerRendererData>;

export function labelToken(type: Token): typeof TokenLabel[Token] {
  return TokenLabel[type]
}

export const logger_renderer: LoggerRenderer = {
  data:      undefined,
  add_token: (_, type) => {
    console.log("add_token:", labelToken(type))
  },
  end_token: (_) => {
    console.log("end_token")
  },
  add_text:  (_, text) => {
    console.log("add_text: \"%s\"", text)
  },
  set_attr:  (_, type, value) => {
    console.log("set_attr: %s=\"%s\"", attr_to_html_attr(type), value)
  },
}

export const TokenLabel: Readonly<Record<Token, string>> = {
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
