import type { Renderer } from "./renderer/types"
import { Token, Attr } from "./tokens"

const TOKEN_ARRAY_CAP = 24

export interface Parser<T> {
  renderer: Renderer<T>;
  text: string;
  pending: string;
  tokens: Uint32Array;
  len: number;
  token: number;
  spaces: Uint8Array;
  indent: string;
  indentLength: number;
  codeFenceBody: 0 | 1;
  backticksCount: number;
  blockquoteIndex: number;
  hrChar: string;
  hrChars: number;
}

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
export function endParser<T>(parser: Parser<T>): void {
  if (parser.pending.length > 0) {
    writeToParser(parser, "\n")
  }
}

function addText<T>(parser: Parser<T>) {
  if (parser.text.length === 0) return
  console.assert(parser.len > 0, "Never adding text to root")
  parser.renderer.addText(parser.renderer.data, parser.text)
  parser.text = ""
}

function endToken<T>(parser: Parser<T>) {
  console.assert(parser.len > 0, "No nodes to end")
  parser.len -= 1
  parser.token = parser.tokens[parser.len]
  parser.renderer.endToken(parser.renderer.data, parser.token)
}

function addToken<T>(parser: Parser<T>, token: Token) {
  parser.len += 1
  parser.tokens[parser.len] = token
  parser.token = token
  parser.renderer.addToken(parser.renderer.data, token)
}

function indexOfToken<T>(parser: Parser<T>, token: Token, startIndex: number) {
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
function endTokensUntilLength<T>(parser: Parser<T>, len: number) {
  while (parser.len > len) {
    endToken(parser)
  }
}

function continueOrAddList<T>(parser: Parser<T>, listToken: Token) {
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
function addListItem<T>(parser: Parser<T>, prefixLength: number) {
  addToken(parser, Token.LIST_ITEM)
  parser.spaces[parser.len] = parser.indentLength + prefixLength
  clearRootPending(parser)
  parser.token = Token.MAYBE_TASK
}

function clearRootPending<T>(parser: Parser<T>) {
  parser.indent = ""
  parser.indentLength = 0
  parser.pending = ""
}

function isDigit(charcode: number) {
  switch (charcode) {
  case 48: case 49: case 50: case 51: case 52:
  case 53: case 54: case 55: case 56: case 57:
    return true
  default:
    return false
  }
}

/**
 * Parse and render another chunk of markdown.
 */
export function writeToParser<T>(parser: Parser<T>, chunk: string): void {
  for (const char of chunk) {
    const pendingWithChar = parser.pending + char
		
    /*
		 Token specific checks
		*/
    switch (parser.token) {
    case Token.LINE_BREAK:
    case Token.DOCUMENT:
    case Token.BLOCKQUOTE:
      console.assert(parser.text.length === 0, "Root should not have any text")

      switch (parser.pending[0]) {
      case undefined:
        parser.pending = char
        continue
      case " ":
        parser.pending = char
        parser.indent += " "
        parser.indentLength += 1
        continue
      case "\t":
        parser.pending = char
        parser.indent += "\t"
        parser.indentLength += 4
        continue
        /* Ignore newlines in root */
      case "\n":
        endTokensUntilLength(parser, parser.blockquoteIndex)
        parser.blockquoteIndex = 0
        parser.backticksCount = 0
        parser.pending = char
        continue
        /* Heading */
      case "#":
        switch (char) {
        case "#":
          if (parser.pending.length < 6) {
            parser.pending = pendingWithChar
            continue
          }
          break // fail
        case " ":
          switch (parser.pending.length) {
          case 1: 
            addToken(parser, Token.HEADING_1) 
            clearRootPending(parser) 
            continue
          case 2: 
            addToken(parser, Token.HEADING_2) 
            clearRootPending(parser) 
            continue
          case 3: 
            addToken(parser, Token.HEADING_3) 
            clearRootPending(parser) 
            continue
          case 4: 
            addToken(parser, Token.HEADING_4) 
            clearRootPending(parser) 
            continue
          case 5: 
            addToken(parser, Token.HEADING_5) 
            clearRootPending(parser) 
            continue
          case 6: 
            addToken(parser, Token.HEADING_6) 
            clearRootPending(parser) 
            continue
          }
          console.assert(false, "Should not reach here")
        }
        break // fail
        /* Blockquote */
      case ">": {
        const nextBlockIndex = indexOfToken(parser, Token.BLOCKQUOTE, parser.blockquoteIndex+1)
				
        /*
				Only when there is no blockquote to the right of blockquoteIndex
				a new blockquote can be created
				*/
        if (nextBlockIndex === -1) {
          endTokensUntilLength(parser, parser.blockquoteIndex)
          parser.blockquoteIndex += 1
          parser.backticksCount = 0
          addToken(parser, Token.BLOCKQUOTE)
        } else {
          parser.blockquoteIndex = nextBlockIndex
        }
				
        clearRootPending(parser)
        parser.pending = char
        continue
      }
      /* Horizontal Rule
			   "-- - --- - --"
			*/
      case "-":
      case "*":
      case "_":
        if (parser.hrChars === 0) {
          console.assert(parser.pending.length === 1, "Pending should be one character")
          parser.hrChars = 1
          parser.hrChar = parser.pending
        }

        if (parser.hrChars > 0) {
          switch (char) {
          case parser.hrChar:
            parser.hrChars += 1
            parser.pending = pendingWithChar
            continue
          case " ":
            parser.pending = pendingWithChar
            continue
          case "\n":
            if (parser.hrChars < 3) break
            parser.renderer.addToken(parser.renderer.data, Token.RULE)
            parser.renderer.endToken(parser.renderer.data, Token.RULE)
            parser.pending = ""
            parser.hrChars = 0
            continue
          }

          parser.hrChars = 0
        }

        /* Unordered list 
				/  * foo
				/  * *bar*
				/  * **baz**
				/*/
        if ("_" !== parser.pending[0] &&
				    " " === parser.pending[1]
        ) {
          continueOrAddList(parser, Token.LIST_UNORDERED)
          addListItem(parser, 2)
          writeToParser(parser, pendingWithChar.slice(2))
          continue
        }

        break // fail
        /* Code Fence */
      case "`":
        /*  ``?
				      ^
				*/
        if (parser.pending.length < 3) {
          if ("`" === char) {
            parser.pending = pendingWithChar
            parser.backticksCount = pendingWithChar.length
            continue
          }
          parser.backticksCount = 0
          break // fail
        }

        switch (char) {
        case "`":
          /*  ````?
						   ^
					*/
          if (parser.pending.length === parser.backticksCount) {
            parser.pending = pendingWithChar
            parser.backticksCount = pendingWithChar.length
          }
          /*  ```code`
							   ^
					*/
          else {
            addToken(parser, Token.PARAGRAPH)
            clearRootPending(parser)
            parser.backticksCount = 0
            writeToParser(parser, pendingWithChar)
          }
          continue
        case "\n":
          /*  ```lang\n
								^
					*/
          addToken(parser, Token.CODE_FENCE)
          if (parser.pending.length > parser.backticksCount) {
            parser.renderer.setAttr(parser.renderer.data, Attr.LANG, parser.pending.slice(parser.backticksCount))
          }
          clearRootPending(parser)
          continue
        default:
          /*  ```lang\n
							^
					*/
          parser.pending = pendingWithChar
          continue
        }
        /*
			List Unordered for '+'
			The other list types are handled with HORIZONTAL_RULE
			*/
      case "+": 
        if (" " !== char) break // fail

        continueOrAddList(parser, Token.LIST_UNORDERED)
        addListItem(parser, 2)
        continue
        /* List Ordered */
      case "0": case "1": case "2": case "3": case "4":
      case "5": case "6": case "7": case "8": case "9":
        /*
				12. foo
				   ^
				*/
        if ("." === parser.pending[parser.pending.length-1]) {
          if (" " !== char) break // fail

          continueOrAddList(parser, Token.LIST_ORDERED)
          if (parser.pending !== "1.") {
            parser.renderer.setAttr(parser.renderer.data, Attr.START, parser.pending.slice(0, -1))
          }
          addListItem(parser, parser.pending.length+1)
          continue
        } else {
          const charCode = char.charCodeAt(0)
          if (46 === charCode || // '.'
					    isDigit(charCode) // 0-9
          ) {
            parser.pending = pendingWithChar
            continue
          }
        }
        break // fail
      }

      let toWrite = pendingWithChar

      /* Add line break */
      if (parser.token & Token.LINE_BREAK) {
        /* Add a line break and continue in previous token */
        parser.token = parser.tokens[parser.len]
        parser.renderer.addToken(parser.renderer.data, Token.LINE_BREAK)
        parser.renderer.endToken(parser.renderer.data, Token.RULE)
      }
      /* Code Block */
      else if (parser.indentLength >= 4) {
        /*
				Case where there are additional spaces
				after the indent that makes the code block
				_________________________
				       code
				^^^^----indent
				    ^^^-part of code
				_________________________
				 \t   code
				^^-----indent
				   ^^^-part of code
				*/
        let codeStart = 0
        for (; codeStart < 4; codeStart += 1) {
          if (parser.indent[codeStart] === "\t") {
            codeStart = codeStart+1
            break
          }
        }

        toWrite = parser.indent.slice(codeStart) + pendingWithChar
        addToken(parser, Token.CODE_BLOCK)
      }
      /* Paragraph */
      else {
        addToken(parser, Token.PARAGRAPH)
      }
			
      clearRootPending(parser)
      writeToParser(parser, toWrite)
      continue
    case Token.CODE_BLOCK:
      switch (pendingWithChar) {
      case "\n    ":
      case "\n   \t":
      case "\n  \t":
      case "\n \t":
      case "\n\t":
        parser.text += "\n"
        parser.pending = ""
        continue
      case "\n":
      case "\n ":
      case "\n  ":
      case "\n   ":
        parser.pending = pendingWithChar
        continue
      default:
        if (parser.pending.length !== 0) {
          addText(parser)
          endToken(parser)
          parser.pending = char
        } else {
          parser.text += char
        }
        continue
      }
    case Token.CODE_FENCE:
      switch (char) {
      case "`":
        if (pendingWithChar.length ===
					parser.backticksCount + parser.codeFenceBody // 0 or 1 for \n
        ) {
          addText(parser)
          endToken(parser)
          parser.pending = ""
          parser.backticksCount = 0
          parser.codeFenceBody = 0
        } else {
          parser.pending = pendingWithChar
        }
        continue
      case "\n":
        parser.text   += parser.pending
        parser.pending = char
        parser.codeFenceBody = 1
        continue
      default:
        parser.text   += pendingWithChar
        parser.pending = ""
        parser.codeFenceBody = 1
        continue
      }
    case Token.CODE_INLINE:
      switch (char) {
      case "`":
        if (pendingWithChar.length ===
				    parser.backticksCount + Number(parser.pending[0] === " ") // 0 or 1 for space
        ) {
          addText(parser)
          endToken(parser)
          parser.pending = ""
          parser.backticksCount = 0
        } else {
          parser.pending = pendingWithChar
        }
        continue
      case "\n":
        parser.text += parser.pending
        parser.pending = ""
        parser.token = Token.LINE_BREAK
        parser.blockquoteIndex = 0
        addText(parser)
        continue
        /* Trim space before ` */
      case " ":
        parser.text += parser.pending
        parser.pending = char
        continue
      default:
        parser.text += pendingWithChar
        parser.pending = ""
        continue
      }
      /* Checkboxes */
    case Token.MAYBE_TASK:
      switch (parser.pending.length) {
      case 0:
        if ("[" !== char) break // fail
        parser.pending = pendingWithChar
        continue
      case 1:
        if (" " !== char && "x" !== char) break // fail
        parser.pending = pendingWithChar
        continue
      case 2:
        if ("]" !== char) break // fail
        parser.pending = pendingWithChar
        continue
      case 3:
        if (" " !== char) break // fail
        parser.renderer.addToken(parser.renderer.data, Token.CHECKBOX)
        if ("x" === parser.pending[1]) {
          parser.renderer.setAttr(parser.renderer.data, Attr.CHECKED, "")
        }
        parser.renderer.endToken(parser.renderer.data, Token.CHECKBOX)
        parser.pending = " "
        continue
      }

      parser.token = parser.tokens[parser.len]
      parser.pending = ""
      writeToParser(parser, pendingWithChar)
      continue
    case Token.STRONG_AST:
    case Token.STRONG_UND: {
      /** @type {string} */ let symbol = "*"
      /** @type {Token } */ let italic = Token.ITALIC_AST
      if (parser.token === Token.STRONG_UND) {
        symbol = "_"
        italic = Token.ITALIC_UND
      }

      if (symbol === parser.pending) {
        addText(parser)
        /* **Bold**
						  ^
				*/
        if (symbol === char) {
          endToken(parser)
          parser.pending = ""
          continue
        }
        /* **Bold*Bold->Em*
						  ^
				*/
        addToken(parser, italic)
        parser.pending = char
        continue
      }

      break
    }
    case Token.ITALIC_AST:
    case Token.ITALIC_UND: {
      /** @type {string} */ let symbol = "*"
      /** @type {Token } */ let strong = Token.STRONG_AST
      if (parser.token === Token.ITALIC_UND) {
        symbol = "_"
        strong = Token.STRONG_UND
      }

      switch (parser.pending) {
      case symbol:
        if (symbol === char) {
          /* Decide between ***bold>em**em* and **bold*bold>em***
					                             ^                       ^
					   With the help of the next character
					*/
          if (parser.tokens[parser.len-1] === strong) {
            parser.pending = pendingWithChar
          }
          /* *em**bold
					       ^
					*/
          else {
            addText(parser)
            addToken(parser, strong)
            parser.pending = ""
          }
        }
        /* *em*foo
					   ^
				*/
        else {
          addText(parser)
          endToken(parser)
          parser.pending = char
        }
        continue
      case symbol+symbol:
        const italic = parser.token
        addText(parser)
        endToken(parser)
        endToken(parser)
        /* ***bold>em**em* or **bold*bold>em***
				               ^                      ^
				*/
        if (symbol !== char) {
          addToken(parser, italic)
          parser.pending = char
        } else {
          parser.pending = ""
        }
        continue
      }
      break
    }
    case Token.STRIKE:
      if ("~~" === pendingWithChar) {
        addText(parser)
        endToken(parser)
        parser.pending = ""
        continue
      }
      break
      /* Raw URLs */
    case Token.MAYBE_URL:
      if ("http://"  === pendingWithChar ||
				"https://" === pendingWithChar
      ) {
        addText(parser)
        addToken(parser, Token.RAW_URL)
        parser.pending = pendingWithChar
        parser.text    = pendingWithChar
      }
      else
        if ("http:/" [parser.pending.length] === char ||
				"https:/"[parser.pending.length] === char
        ) {
          parser.pending = pendingWithChar
        }
        else {
          parser.token = parser.tokens[parser.len]
          writeToParser(parser, char)
        }
      continue
    case Token.LINK:
    case Token.IMAGE:
      if ("]" === parser.pending) {
        /*
				[Link](url)
					 ^
				*/
        addText(parser)
        if ("(" === char) {
          parser.pending = pendingWithChar
        } else {
          endToken(parser)
          parser.pending = char
        }
        continue
      }
      if ("]" === parser.pending[0] &&
			    "(" === parser.pending[1]
      ) {
        /*
				[Link](url)
						  ^
				*/
        if (")" === char) {
          const type = parser.token === Token.LINK ? Attr.HREF : Attr.SRC
          const url = parser.pending.slice(2)
          parser.renderer.setAttr(parser.renderer.data, type, url)
          endToken(parser)
          parser.pending = ""
        } else {
          parser.pending += char
        }
        continue
      }
      break
    case Token.RAW_URL:
      /* http://example.com?
			                     ^
			*/
      if (" " === char ||
			    "\n"=== char ||
			    "\\"=== char
      ) {
        parser.renderer.setAttr(parser.renderer.data, Attr.HREF, parser.pending)
        addText(parser)
        endToken(parser)
        parser.pending = char
      } else {
        parser.text   += char
        parser.pending = pendingWithChar
      }
      continue
    }

    /*
		Common checks
		*/
    switch (parser.pending[0]) {
    /* Escape character */
    case "\\":
      if ("\n" === char) {
        // Escaped newline has the same affect as unescaped one
        parser.pending = char
      } else {
        const char_code = char.charCodeAt(0)
        parser.pending = ""
        parser.text += isDigit(char_code)                   || // 0-9
				          (char_code >= 65 && char_code <= 90) || // A-Z
				          (char_code >= 97 && char_code <= 122)   // a-z
				          ? pendingWithChar
				          : char
      }
      continue
      /* Newline */
    case "\n":
      addText(parser)
      parser.token = Token.LINE_BREAK
      parser.blockquoteIndex = 0
      parser.pending = char
      continue
      /* `Code Inline` */
    case "`":
      if (parser.token & Token.IMAGE) break

      if ("`" === char) {
        parser.backticksCount += 1
        parser.pending = pendingWithChar
      } else {
        parser.backticksCount += 1 // started at 0, and first wasn't counted
        addText(parser)
        addToken(parser, Token.CODE_INLINE)
        parser.text = " " === char || "\n" === char ? "" : char // trim leading space
        parser.pending = ""
      }
      continue
    case "_":
    case "*": {
      if (parser.token & Token.IMAGE) break

      /** @type {Token} */ let italic = Token.ITALIC_AST
      /** @type {Token} */ let strong = Token.STRONG_AST
      const symbol = parser.pending[0]
      if ("_" === symbol) {
        italic = Token.ITALIC_UND 
        strong = Token.STRONG_UND
      }

      if (parser.pending.length === 1) {
        /* **Strong**
					^
				*/
        if (symbol === char) {
          parser.pending = pendingWithChar
          continue
        }
        /* *Em*
					^
				*/
        if (" " !== char && "\n" !== char) {
          addText(parser)
          addToken(parser, italic)
          parser.pending = char
          continue
        }
      } else {
        /* ***Strong->Em***
					 ^
				*/
        if (symbol === char) {
          addText(parser)
          addToken(parser, strong)
          addToken(parser, italic)
          parser.pending = ""
          continue
        }
        /* **Strong**
					 ^
				*/
        if (" " !== char && "\n" !== char) {
          addText(parser)
          addToken(parser, strong)
          parser.pending = char
          continue
        }
      }

      break
    }
    case "~":
      if (parser.token & (Token.IMAGE | Token.STRIKE)) break

      if ("~" === parser.pending) {
        /* ~~Strike~~
					^
				*/
        if ("~" === char) {
          parser.pending = pendingWithChar
          continue
        }
      } else {
        /* ~~Strike~~
					 ^
				*/
        if (" " !== char && "\n" !== char) {
          addText(parser)
          addToken(parser, Token.STRIKE)
          parser.pending = char
          continue
        }
      }

      break
      /* [Image](url) */
    case "[":
      if (!(parser.token & (Token.IMAGE | Token.LINK)) &&
			    "]" !== char
      ) {
        addText(parser)
        addToken(parser, Token.LINK)
        parser.pending = char
        continue
      }
      break
      /* ![Image](url) */
    case "!":
      if (!(parser.token & Token.IMAGE) &&
			    "[" === char
      ) {
        addText(parser)
        addToken(parser, Token.IMAGE)
        parser.pending = ""
        continue
      }
      break
      /* Trim spaces */
    case " ":
      if (" " === char) {
        continue
      }
      break
    }

    /* foo http://...
		       ^
		*/
    if (!(parser.token & (Token.IMAGE | Token.LINK)) &&
		    "h" === char &&
		   (" " === parser.pending ||
		    ""  === parser.pending)
    ) {
      parser.text += parser.pending
      parser.pending = char
      parser.token = Token.MAYBE_URL
      continue
    }

    /*
		No check hit
		*/
    parser.text += parser.pending
    parser.pending = char
  }

  addText(parser)
}