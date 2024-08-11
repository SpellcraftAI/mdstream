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
export function endParser<T>(p: Parser<T>): void {
  if (p.pending.length > 0) {
    writeToParser(p, "\n")
  }
}

function addText<T>(p: Parser<T>) {
  if (p.text.length === 0) return
  console.assert(p.len > 0, "Never adding text to root")
  p.renderer.addText(p.renderer.data, p.text)
  p.text = ""
}

function endToken<T>(p: Parser<T>) {
  console.assert(p.len > 0, "No nodes to end")
  p.len -= 1
  p.token = (p.tokens[p.len])
  p.renderer.endToken(p.renderer.data, p.token)
}

function addToken<T>(p: Parser<T>, token: Token) {
  p.len += 1
  p.tokens[p.len] = token
  p.token = token
  p.renderer.addToken(p.renderer.data, token)
}

function indexOfToken<T>(p: Parser<T>, token: Token, startIndex: number) {
  while (startIndex <= p.len) {
    if (p.tokens[startIndex] & token) {
      return startIndex
    }
    startIndex += 1
  }
  return -1
}

/**
 * End tokens until the parser has the given length.
 */
function endTokensUntilLength<T>(p: Parser<T>, len: number) {
  while (p.len > len) {
    endToken(p)
  }
}

function continueOrAddList<T>(p: Parser<T>, listToken: Token) {
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

  for (let i = p.blockquoteIndex + 1; i <= p.len; i++) {
    if (p.tokens[i] & Token.LIST_ITEM) {
      if (p.tokens[i-1] & listToken) {
        listIndex = i-1
      }

      if (p.indentLength < p.spaces[i]) {
        itemIndex = -1
        break
      }

      itemIndex = i
    }
  }

  if (itemIndex === -1) {
    if (listIndex === -1) {
      endTokensUntilLength(p, p.blockquoteIndex)
      addToken(p, listToken)
    } else {
      endTokensUntilLength(p, listIndex)
    }
  } else {
    endTokensUntilLength(p, itemIndex)
    addToken(p, listToken)
  }
}

/**
 * Create a new list
 * or continue the last one
 */
function addListItem<T>(p: Parser<T>, prefixLength: number) {
  addToken(p, Token.LIST_ITEM)
  p.spaces[p.len] = p.indentLength + prefixLength
  clearRootPending(p)
  p.token = Token.MAYBE_TASK
}

function clearRootPending<T>(p: Parser<T>) {
  p.indent = ""
  p.indentLength = 0
  p.pending = ""
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
export function writeToParser<T>(p: Parser<T>, chunk: string): void {
  for (const char of chunk) {
    const pendingWithChar = p.pending + char
		
    /*
		 Token specific checks
		*/
    switch (p.token) {
    case Token.LINE_BREAK:
    case Token.DOCUMENT:
    case Token.BLOCKQUOTE:
      console.assert(p.text.length === 0, "Root should not have any text")

      switch (p.pending[0]) {
      case undefined:
        p.pending = char
        continue
      case " ":
        p.pending = char
        p.indent += " "
        p.indentLength += 1
        continue
      case "\t":
        p.pending = char
        p.indent += "\t"
        p.indentLength += 4
        continue
        /* Ignore newlines in root */
      case "\n":
        endTokensUntilLength(p, p.blockquoteIndex)
        p.blockquoteIndex = 0
        p.backticksCount = 0
        p.pending = char
        continue
        /* Heading */
      case "#":
        switch (char) {
        case "#":
          if (p.pending.length < 6) {
            p.pending = pendingWithChar
            continue
          }
          break // fail
        case " ":
          switch (p.pending.length) {
          case 1: 
            addToken(p, Token.HEADING_1) 
            clearRootPending(p) 
            continue
          case 2: 
            addToken(p, Token.HEADING_2) 
            clearRootPending(p) 
            continue
          case 3: 
            addToken(p, Token.HEADING_3) 
            clearRootPending(p) 
            continue
          case 4: 
            addToken(p, Token.HEADING_4) 
            clearRootPending(p) 
            continue
          case 5: 
            addToken(p, Token.HEADING_5) 
            clearRootPending(p) 
            continue
          case 6: 
            addToken(p, Token.HEADING_6) 
            clearRootPending(p) 
            continue
          }
          console.assert(false, "Should not reach here")
        }
        break // fail
        /* Blockquote */
      case ">": {
        const nextBlockIndex = indexOfToken(p, Token.BLOCKQUOTE, p.blockquoteIndex+1)
				
        /*
				Only when there is no blockquote to the right of blockquoteIndex
				a new blockquote can be created
				*/
        if (nextBlockIndex === -1) {
          endTokensUntilLength(p, p.blockquoteIndex)
          p.blockquoteIndex += 1
          p.backticksCount = 0
          addToken(p, Token.BLOCKQUOTE)
        } else {
          p.blockquoteIndex = nextBlockIndex
        }
				
        clearRootPending(p)
        p.pending = char
        continue
      }
      /* Horizontal Rule
			   "-- - --- - --"
			*/
      case "-":
      case "*":
      case "_":
        if (p.hrChars === 0) {
          console.assert(p.pending.length === 1, "Pending should be one character")
          p.hrChars = 1
          p.hrChar = p.pending
        }

        if (p.hrChars > 0) {
          switch (char) {
          case p.hrChar:
            p.hrChars += 1
            p.pending = pendingWithChar
            continue
          case " ":
            p.pending = pendingWithChar
            continue
          case "\n":
            if (p.hrChars < 3) break
            p.renderer.addToken(p.renderer.data, Token.RULE)
            p.renderer.endToken(p.renderer.data, Token.RULE)
            p.pending = ""
            p.hrChars = 0
            continue
          }

          p.hrChars = 0
        }

        /* Unordered list 
				/  * foo
				/  * *bar*
				/  * **baz**
				/*/
        if ("_" !== p.pending[0] &&
				    " " === p.pending[1]
        ) {
          continueOrAddList(p, Token.LIST_UNORDERED)
          addListItem(p, 2)
          writeToParser(p, pendingWithChar.slice(2))
          continue
        }

        break // fail
        /* Code Fence */
      case "`":
        /*  ``?
				      ^
				*/
        if (p.pending.length < 3) {
          if ("`" === char) {
            p.pending = pendingWithChar
            p.backticksCount = pendingWithChar.length
            continue
          }
          p.backticksCount = 0
          break // fail
        }

        switch (char) {
        case "`":
          /*  ````?
						   ^
					*/
          if (p.pending.length === p.backticksCount) {
            p.pending = pendingWithChar
            p.backticksCount = pendingWithChar.length
          }
          /*  ```code`
							   ^
					*/
          else {
            addToken(p, Token.PARAGRAPH)
            clearRootPending(p)
            p.backticksCount = 0
            writeToParser(p, pendingWithChar)
          }
          continue
        case "\n":
          /*  ```lang\n
								^
					*/
          addToken(p, Token.CODE_FENCE)
          if (p.pending.length > p.backticksCount) {
            p.renderer.setAttr(p.renderer.data, Attr.LANG, p.pending.slice(p.backticksCount))
          }
          clearRootPending(p)
          continue
        default:
          /*  ```lang\n
							^
					*/
          p.pending = pendingWithChar
          continue
        }
        /*
			List Unordered for '+'
			The other list types are handled with HORIZONTAL_RULE
			*/
      case "+": 
        if (" " !== char) break // fail

        continueOrAddList(p, Token.LIST_UNORDERED)
        addListItem(p, 2)
        continue
        /* List Ordered */
      case "0": case "1": case "2": case "3": case "4":
      case "5": case "6": case "7": case "8": case "9":
        /*
				12. foo
				   ^
				*/
        if ("." === p.pending[p.pending.length-1]) {
          if (" " !== char) break // fail

          continueOrAddList(p, Token.LIST_ORDERED)
          if (p.pending !== "1.") {
            p.renderer.setAttr(p.renderer.data, Attr.START, p.pending.slice(0, -1))
          }
          addListItem(p, p.pending.length+1)
          continue
        } else {
          const charCode = char.charCodeAt(0)
          if (46 === charCode || // '.'
					    isDigit(charCode) // 0-9
          ) {
            p.pending = pendingWithChar
            continue
          }
        }
        break // fail
      }

      let toWrite = pendingWithChar

      /* Add line break */
      if (p.token & Token.LINE_BREAK) {
        /* Add a line break and continue in previous token */
        p.token = p.tokens[p.len]
        p.renderer.addToken(p.renderer.data, Token.LINE_BREAK)
        p.renderer.endToken(p.renderer.data, Token.RULE)
      }
      /* Code Block */
      else if (p.indentLength >= 4) {
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
          if (p.indent[codeStart] === "\t") {
            codeStart = codeStart+1
            break
          }
        }

        toWrite = p.indent.slice(codeStart) + pendingWithChar
        addToken(p, Token.CODE_BLOCK)
      }
      /* Paragraph */
      else {
        addToken(p, Token.PARAGRAPH)
      }
			
      clearRootPending(p)
      writeToParser(p, toWrite)
      continue
    case Token.CODE_BLOCK:
      switch (pendingWithChar) {
      case "\n    ":
      case "\n   \t":
      case "\n  \t":
      case "\n \t":
      case "\n\t":
        p.text += "\n"
        p.pending = ""
        continue
      case "\n":
      case "\n ":
      case "\n  ":
      case "\n   ":
        p.pending = pendingWithChar
        continue
      default:
        if (p.pending.length !== 0) {
          addText(p)
          endToken(p)
          p.pending = char
        } else {
          p.text += char
        }
        continue
      }
    case Token.CODE_FENCE:
      switch (char) {
      case "`":
        if (pendingWithChar.length ===
					p.backticksCount + p.codeFenceBody // 0 or 1 for \n
        ) {
          addText(p)
          endToken(p)
          p.pending = ""
          p.backticksCount = 0
          p.codeFenceBody = 0
        } else {
          p.pending = pendingWithChar
        }
        continue
      case "\n":
        p.text   += p.pending
        p.pending = char
        p.codeFenceBody = 1
        continue
      default:
        p.text   += pendingWithChar
        p.pending = ""
        p.codeFenceBody = 1
        continue
      }
    case Token.CODE_INLINE:
      switch (char) {
      case "`":
        if (pendingWithChar.length ===
				    p.backticksCount + Number(p.pending[0] === " ") // 0 or 1 for space
        ) {
          addText(p)
          endToken(p)
          p.pending = ""
          p.backticksCount = 0
        } else {
          p.pending = pendingWithChar
        }
        continue
      case "\n":
        p.text += p.pending
        p.pending = ""
        p.token = Token.LINE_BREAK
        p.blockquoteIndex = 0
        addText(p)
        continue
        /* Trim space before ` */
      case " ":
        p.text += p.pending
        p.pending = char
        continue
      default:
        p.text += pendingWithChar
        p.pending = ""
        continue
      }
      /* Checkboxes */
    case Token.MAYBE_TASK:
      switch (p.pending.length) {
      case 0:
        if ("[" !== char) break // fail
        p.pending = pendingWithChar
        continue
      case 1:
        if (" " !== char && "x" !== char) break // fail
        p.pending = pendingWithChar
        continue
      case 2:
        if ("]" !== char) break // fail
        p.pending = pendingWithChar
        continue
      case 3:
        if (" " !== char) break // fail
        p.renderer.addToken(p.renderer.data, Token.CHECKBOX)
        if ("x" === p.pending[1]) {
          p.renderer.setAttr(p.renderer.data, Attr.CHECKED, "")
        }
        p.renderer.endToken(p.renderer.data, Token.CHECKBOX)
        p.pending = " "
        continue
      }

      p.token = p.tokens[p.len]
      p.pending = ""
      writeToParser(p, pendingWithChar)
      continue
    case Token.STRONG_AST:
    case Token.STRONG_UND: {
      /** @type {string} */ let symbol = "*"
      /** @type {Token } */ let italic = Token.ITALIC_AST
      if (p.token === Token.STRONG_UND) {
        symbol = "_"
        italic = Token.ITALIC_UND
      }

      if (symbol === p.pending) {
        addText(p)
        /* **Bold**
						  ^
				*/
        if (symbol === char) {
          endToken(p)
          p.pending = ""
          continue
        }
        /* **Bold*Bold->Em*
						  ^
				*/
        addToken(p, italic)
        p.pending = char
        continue
      }

      break
    }
    case Token.ITALIC_AST:
    case Token.ITALIC_UND: {
      /** @type {string} */ let symbol = "*"
      /** @type {Token } */ let strong = Token.STRONG_AST
      if (p.token === Token.ITALIC_UND) {
        symbol = "_"
        strong = Token.STRONG_UND
      }

      switch (p.pending) {
      case symbol:
        if (symbol === char) {
          /* Decide between ***bold>em**em* and **bold*bold>em***
					                             ^                       ^
					   With the help of the next character
					*/
          if (p.tokens[p.len-1] === strong) {
            p.pending = pendingWithChar
          }
          /* *em**bold
					       ^
					*/
          else {
            addText(p)
            addToken(p, strong)
            p.pending = ""
          }
        }
        /* *em*foo
					   ^
				*/
        else {
          addText(p)
          endToken(p)
          p.pending = char
        }
        continue
      case symbol+symbol:
        const italic = p.token
        addText(p)
        endToken(p)
        endToken(p)
        /* ***bold>em**em* or **bold*bold>em***
				               ^                      ^
				*/
        if (symbol !== char) {
          addToken(p, italic)
          p.pending = char
        } else {
          p.pending = ""
        }
        continue
      }
      break
    }
    case Token.STRIKE:
      if ("~~" === pendingWithChar) {
        addText(p)
        endToken(p)
        p.pending = ""
        continue
      }
      break
      /* Raw URLs */
    case Token.MAYBE_URL:
      if ("http://"  === pendingWithChar ||
				"https://" === pendingWithChar
      ) {
        addText(p)
        addToken(p, Token.RAW_URL)
        p.pending = pendingWithChar
        p.text    = pendingWithChar
      }
      else
        if ("http:/" [p.pending.length] === char ||
				"https:/"[p.pending.length] === char
        ) {
          p.pending = pendingWithChar
        }
        else {
          p.token = p.tokens[p.len]
          writeToParser(p, char)
        }
      continue
    case Token.LINK:
    case Token.IMAGE:
      if ("]" === p.pending) {
        /*
				[Link](url)
					 ^
				*/
        addText(p)
        if ("(" === char) {
          p.pending = pendingWithChar
        } else {
          endToken(p)
          p.pending = char
        }
        continue
      }
      if ("]" === p.pending[0] &&
			    "(" === p.pending[1]
      ) {
        /*
				[Link](url)
						  ^
				*/
        if (")" === char) {
          const type = p.token === Token.LINK ? Attr.HREF : Attr.SRC
          const url = p.pending.slice(2)
          p.renderer.setAttr(p.renderer.data, type, url)
          endToken(p)
          p.pending = ""
        } else {
          p.pending += char
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
        p.renderer.setAttr(p.renderer.data, Attr.HREF, p.pending)
        addText(p)
        endToken(p)
        p.pending = char
      } else {
        p.text   += char
        p.pending = pendingWithChar
      }
      continue
    }

    /*
		Common checks
		*/
    switch (p.pending[0]) {
    /* Escape character */
    case "\\":
      if ("\n" === char) {
        // Escaped newline has the same affect as unescaped one
        p.pending = char
      } else {
        const char_code = char.charCodeAt(0)
        p.pending = ""
        p.text += isDigit(char_code)                   || // 0-9
				          (char_code >= 65 && char_code <= 90) || // A-Z
				          (char_code >= 97 && char_code <= 122)   // a-z
				          ? pendingWithChar
				          : char
      }
      continue
      /* Newline */
    case "\n":
      addText(p)
      p.token = Token.LINE_BREAK
      p.blockquoteIndex = 0
      p.pending = char
      continue
      /* `Code Inline` */
    case "`":
      if (p.token & Token.IMAGE) break

      if ("`" === char) {
        p.backticksCount += 1
        p.pending = pendingWithChar
      } else {
        p.backticksCount += 1 // started at 0, and first wasn't counted
        addText(p)
        addToken(p, Token.CODE_INLINE)
        p.text = " " === char || "\n" === char ? "" : char // trim leading space
        p.pending = ""
      }
      continue
    case "_":
    case "*": {
      if (p.token & Token.IMAGE) break

      /** @type {Token} */ let italic = Token.ITALIC_AST
      /** @type {Token} */ let strong = Token.STRONG_AST
      const symbol = p.pending[0]
      if ("_" === symbol) {
        italic = Token.ITALIC_UND 
        strong = Token.STRONG_UND
      }

      if (p.pending.length === 1) {
        /* **Strong**
					^
				*/
        if (symbol === char) {
          p.pending = pendingWithChar
          continue
        }
        /* *Em*
					^
				*/
        if (" " !== char && "\n" !== char) {
          addText(p)
          addToken(p, italic)
          p.pending = char
          continue
        }
      } else {
        /* ***Strong->Em***
					 ^
				*/
        if (symbol === char) {
          addText(p)
          addToken(p, strong)
          addToken(p, italic)
          p.pending = ""
          continue
        }
        /* **Strong**
					 ^
				*/
        if (" " !== char && "\n" !== char) {
          addText(p)
          addToken(p, strong)
          p.pending = char
          continue
        }
      }

      break
    }
    case "~":
      if (p.token & (Token.IMAGE | Token.STRIKE)) break

      if ("~" === p.pending) {
        /* ~~Strike~~
					^
				*/
        if ("~" === char) {
          p.pending = pendingWithChar
          continue
        }
      } else {
        /* ~~Strike~~
					 ^
				*/
        if (" " !== char && "\n" !== char) {
          addText(p)
          addToken(p, Token.STRIKE)
          p.pending = char
          continue
        }
      }

      break
      /* [Image](url) */
    case "[":
      if (!(p.token & (Token.IMAGE | Token.LINK)) &&
			    "]" !== char
      ) {
        addText(p)
        addToken(p, Token.LINK)
        p.pending = char
        continue
      }
      break
      /* ![Image](url) */
    case "!":
      if (!(p.token & Token.IMAGE) &&
			    "[" === char
      ) {
        addText(p)
        addToken(p, Token.IMAGE)
        p.pending = ""
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
    if (!(p.token & (Token.IMAGE | Token.LINK)) &&
		    "h" === char &&
		   (" " === p.pending ||
		    ""  === p.pending)
    ) {
      p.text   += p.pending
      p.pending = char
      p.token = Token.MAYBE_URL
      continue
    }

    /*
		No check hit
		*/
    p.text += p.pending
    p.pending = char
  }

  addText(p)
}