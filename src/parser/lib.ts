import { Token } from "../tokens"
import type { Renderer } from "../renderer"

import { parse } from "./parse"
import type { Parser } from "./types"

const TOKEN_ARRAY_CAP = 24

export function createParser<T>(renderer: Renderer<T>): Parser<T> {
  const tokens = new Uint32Array(TOKEN_ARRAY_CAP)
  tokens[0] = Token.DOCUMENT
  return {
    renderer  : renderer,
    text      : "",
    pending   : "",
    tokens    : tokens,
    len       : 0,
    token     : Token.DOCUMENT,
    codeFenceBody: 0,
    blockquoteIndex: 0,
    hrChar   : "",
    hrChars  : 0,
    backticksCount: 0,
    spaces    : new Uint8Array(TOKEN_ARRAY_CAP),
    indent    : "",
    indentLength: 0,
  }
}


/**
 * Finish rendering the markdown - flushes any remaining text.
 */
export function finish<T>(parser: Parser<T>): void {
  if (parser.pending.length > 0) {
    parse(parser, "\n")
  }
}

export function addText<T>(parser: Parser<T>): void {
  if (parser.text.length === 0) return
  // console.assert(parser.len > 0, "Never adding text to root")
  parser.renderer.addText(parser.renderer.data, parser.text)
  parser.text = ""
}

export function endToken<T>(parser: Parser<T>): void {
  // console.assert(parser.len > 0, "No nodes to end")
  parser.len -= 1
  parser.token = parser.tokens[parser.len]
  parser.renderer.endToken(parser.renderer.data, parser.tokens[parser.len + 1])
}

export function addToken<T>(parser: Parser<T>, token: Token): void {
  parser.len += 1
  parser.tokens[parser.len] = token
  parser.token = token
  parser.renderer.addToken(parser.renderer.data, token)
}

export function indexOfToken<T>(parser: Parser<T>, token: Token, startIndex: number): number {
  while (startIndex <= parser.len) {
    if (parser.tokens[startIndex] & token) {
      return startIndex
    }
    startIndex += 1
  }
  return -1
}

/**
 * End tokens until the parser has the given length.
 */
export function endTokensUntilLength<T>(parser: Parser<T>, len: number): void {
  while (parser.len > len) {
    endToken(parser)
  }
}

export function continueOrAddList<T>(parser: Parser<T>, listToken: Token): void {
  /* will create a new list inside the last item
	   if the amount of spaces is greater than the last one (with prefix)
	   1. foo
	      - bar      <- new nested ul
	         - baz   <- new nested ul
	      12. qux    <- cannot be nested in "baz" or "bar",
	                    so it's a new list in "foo"
	*/
  let listIndex = -1
  let itemIndex = -1

  for (let i = parser.blockquoteIndex + 1; i <= parser.len; i++) {
    if (parser.tokens[i] & Token.LIST_ITEM) {
      if (parser.tokens[i-1] & listToken) {
        listIndex = i-1
      }

      if (parser.indentLength < parser.spaces[i]) {
        itemIndex = -1
        break
      }

      itemIndex = i
    }
  }

  if (itemIndex === -1) {
    if (listIndex === -1) {
      endTokensUntilLength(parser, parser.blockquoteIndex)
      addToken(parser, listToken)
    } else {
      endTokensUntilLength(parser, listIndex)
    }
  } else {
    endTokensUntilLength(parser, itemIndex)
    addToken(parser, listToken)
  }
}

/**
 * Create a new list
 * or continue the last one
 */
export function addListItem<T>(parser: Parser<T>, prefixLength: number): void {
  addToken(parser, Token.LIST_ITEM)
  parser.spaces[parser.len] = parser.indentLength + prefixLength
  clearRootPending(parser)
  parser.token = Token.MAYBE_TASK
}

export function clearRootPending<T>(parser: Parser<T>): void {
  parser.indent = ""
  parser.indentLength = 0
  parser.pending = ""
}