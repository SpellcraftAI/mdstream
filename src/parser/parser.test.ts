import * as t from "bun:test"

import type { Children } from "../types"
import { Token, Attr } from "../tokens"
import { labelToken } from "../renderer"
import { createParser, parse, finish } from "."

import type { TestRendererNode  } from "../../test/types"
import { expectChildren, createTestRenderer } from "../../test/utils"

const br: TestRendererNode = {
  type: Token.LINE_BREAK,
  children: []
}

function testSingleWrite<T extends string | TestRendererNode>(title: string, markdown: string, expectedChildren: Children<T>) {
  t.test(title + ";", () => {
    const renderer = createTestRenderer()
    const parser = createParser(renderer)
  
    parse(parser, markdown)
    finish(parser)
  
    expectChildren(renderer.data.root.children, expectedChildren)
  })
  
  t.test(title + "; by_char;", () => {
    const renderer = createTestRenderer()
    const parser = createParser(renderer)
  
    for (const char of markdown) {
      parse(parser, char)
    }

    finish(parser)
    expectChildren(renderer.data.root.children, expectedChildren)
  })
}

for (let level = 1; level <= 6; level += 1) {
  let headingType: Token
  switch (level) {
  case 1: headingType = Token.HEADING_1; break
  case 2: headingType = Token.HEADING_2; break
  case 3: headingType = Token.HEADING_3; break
  case 4: headingType = Token.HEADING_4; break
  case 5: headingType = Token.HEADING_5; break
  case 6: headingType = Token.HEADING_6; break
  default: throw new Error("Invalid heading level")
  }

  testSingleWrite(`Heading_${level}`,
    "#".repeat(level) + " " + "foo",
    [{
      type    : headingType,
      children: ["foo"]
    }]
  )

  testSingleWrite(`Heading_${level} with Line Italic`,
    "#".repeat(level) + " foo *bar*",
    [{
      type    : headingType,
      children: ["foo ", {
        type    : Token.ITALIC_AST,
        children: ["bar"]
      }]
    }]
  )

  testSingleWrite(`Heading_${level} after line break`,
    "\n" + "#".repeat(level) + " " + "foo",
    [{
      type    : headingType,
      children: ["foo"]
    }]
  )
}

testSingleWrite("Line Breaks",
  "foo\nbar",
  [{
    type    : Token.PARAGRAPH,
    children: ["foo", br, "bar"],
  }]
)

testSingleWrite("Line Breaks with Italic",
  "*a\nb*",
  [{
    type    : Token.PARAGRAPH,
    children: [{
      type    : Token.ITALIC_AST,
      children: ["a", br, "b"]
    }],
  }]
)

testSingleWrite("Escaped Line Breaks",
  "a\\\nb",
  [{
    type    : Token.PARAGRAPH,
    children: ["a", br, "b"],
  }]
)

testSingleWrite("Paragraphs",
  "foo\n\nbar",
  [{
    type    : Token.PARAGRAPH,
    children: ["foo"],
  }, {
    type    : Token.PARAGRAPH,
    children: ["bar"],
  }]
)

testSingleWrite("Paragraph trim leading spaces",
  "  foo",
  [{
    type    : Token.PARAGRAPH,
    children: ["foo"],
  }]
)

testSingleWrite("Trim too many spaces",
  "foo       bar",
  [{
    type    : Token.PARAGRAPH,
    children: ["foo bar"],
  }]
)

testSingleWrite("Trim too many spaces in italic",
  "*foo       bar*",
  [{
    type    : Token.PARAGRAPH,
    children: [{
      type    : Token.ITALIC_AST,
      children: ["foo bar"]
    }],
  }]
)

for (const c of ["*", "-", "_"]) {
  for (let l = 3; l <= 6; l += 1) {
    let txt = ""
    for (let i = 0; i < l; i += 1) {
      if (i % 2 === 0) {
        txt += " " // mix in some spaces
      }
      txt += c
    }

    testSingleWrite("Horizontal Rule \"" + txt + "\"",
      txt,
      [{
        type    : Token.RULE,
        children: []
      }]
    )
  }
}

testSingleWrite("Text after Horizontal Rule",
  "---\nfoo",
  [{
    type    : Token.RULE,
    children: []
  }, {
    type    : Token.PARAGRAPH,
    children: ["foo"],
  }]
)

for (let l = 1; l <= 4; l += 1) {
  const c = "`".repeat(l)

  testSingleWrite("Code Inline" + " - "+l+" backticks",
    c + "a" + c,
    [{
      type    : Token.PARAGRAPH,
      children: [{
        type    : Token.CODE_INLINE,
        children: ["a"]
      }],
    }]
  )

  testSingleWrite("Code Inline trims spaces" + " - "+l+" backticks",
    c + " a " + c,
    [{
      type    : Token.PARAGRAPH,
      children: [{
        type    : Token.CODE_INLINE,
        children: ["a"]
      }],
    }]
  )

  testSingleWrite("Code Inline x2" + " - "+l+" backticks",
    c+"a"+c+" "+c+"b"+c,
    [{
      type    : Token.PARAGRAPH,
      children: [{
        type    : Token.CODE_INLINE,
        children: ["a"]
      }, " ", {
        type    : Token.CODE_INLINE,
        children: ["b"]
      }],
    }]
  )

  if (l > 1) {
    const m = "`".repeat(l - 1)

    testSingleWrite("Code ` Inline" + " - "+l+" backticks",
      c + "a"+m+"b" + c,
      [{
        type    : Token.PARAGRAPH,
        children: [{
          type    : Token.CODE_INLINE,
          children: ["a"+m+"b"]
        }],
      }]
    )
  }
}

for (let l = 1; l <= 2; l += 1) {
  const c = "`".repeat(l)

  testSingleWrite("Code with line break" + " - "+l+" backticks",
    c + "a\nb" + c,
    [{
      type    : Token.PARAGRAPH,
      children: [{
        type    : Token.CODE_INLINE,
        children: ["a", br, "b"]
      }],
    }]
  )

  testSingleWrite("Code with two line breaks" + " - "+l+" backticks",
    c + "a\n\nb",
    [{
      type    : Token.PARAGRAPH,
      children: [{
        type    : Token.CODE_INLINE,
        children: ["a"]
      }],
    }, {
      type    : Token.PARAGRAPH,
      children: ["b"],
    }]
  )
}

for (let l = 3; l <= 5; l += 1) {
  const c = "`".repeat(l)

  testSingleWrite("Empty Code_Fence - " + l + " backticks",
    c+"\n"+c,
    [{
      type    : Token.CODE_FENCE,
      children: []
    }]
  )

  testSingleWrite("Code_Fence - " + l + " backticks",
    c+"\nfoo\n"+c,
    [{
      type    : Token.CODE_FENCE,
      children: ["foo"]
    }]
  )

  testSingleWrite("Code_Fence with language - " + l + " backticks",
    c+"js\nfoo\n"+c,
    [{
      type    : Token.CODE_FENCE,
      children: ["foo"],
      attrs   : {[Attr.LANG]: "js"}
    }]
  )

  const m = "`".repeat(l - 1)

  testSingleWrite("Code_Fence escaped backticks - " + l + " backticks",
    c+"\n"+m+"\n"+c,
    [{
      type    : Token.CODE_FENCE,
      children: [m]
    }]
  )

  testSingleWrite("Code_Fence with unfinished end backticks - " + l + " backticks",
    c+"\na\n"+m+"\n"+c,
    [{
      type    : Token.CODE_FENCE,
      children: ["a\n"+m+""]
    }]
  )
}


for (const indent of [
  "    ",
  "   \t",
  "  \t",
  " \t",
  "\t",
]) {
  const escaped_indent = indent.replace(/\t/g, "\\t")

  testSingleWrite("Code_Block; indent: '"+escaped_indent+"'",
    indent + "  foo",
    [{
      type    : Token.CODE_BLOCK,
      children: ["  foo"]
    }]
  )

  testSingleWrite("Code_Block multiple lines; indent: '"+escaped_indent+"'",
    indent + "foo\n" +
		indent + "bar",
    [{
      type    : Token.CODE_BLOCK,
      children: ["foo\nbar"]
    }]
  )

  testSingleWrite("Code_Block end; indent: '"+escaped_indent+"'",
    indent+"foo\n" +
		"bar",
    [{
      type    : Token.CODE_BLOCK,
      children: ["foo"]
    }, {
      type    : Token.PARAGRAPH,
      children: ["bar"]
    }]
  )
}


for (const {c, italic, strong} of [{
  c: "*",
  italic: Token.ITALIC_AST,
  strong: Token.STRONG_AST,
}, {
  c: "_",
  italic: Token.ITALIC_UND,
  strong: Token.STRONG_UND,
}]) {
  const case1 = ""+c+c+"bold"+c+"bold>em"+c+c+c+""
  const case2 = ""+c+c+c+"bold>em"+c+"bold"+c+c+""
  const case3 = ""+c+"em"+c+c+"em>bold"+c+c+c+""
  const case4 = ""+c+c+c+"bold>em"+c+c+"em"+c+""

  testSingleWrite("Italic & Bold \""+case1+"\'",
    case1,
    [{
      type    : Token.PARAGRAPH,
      children: [{
        type    : strong,
        children: ["bold", {
          type    : italic,
          children: ["bold>em"]
        }]
      }]
    }]
  )

  testSingleWrite("Italic & Bold \""+case2+"\'",
    case2,
    [{
      type    : Token.PARAGRAPH,
      children: [{
        type    : strong,
        children: [{
          type    : italic,
          children: ["bold>em"]
        },
        "bold"]
      }]
    }]
  )

  testSingleWrite("Italic & Bold \""+case3+"\'",
    case3,
    [{
      type    : Token.PARAGRAPH,
      children: [{
        type    : italic,
        children: ["em", {
          type    : strong,
          children: ["em>bold"]
        }]
      }]
    }]
  )

  testSingleWrite("Italic & Bold \""+case4+"\'",
    case4,
    [{
      type    : Token.PARAGRAPH,
      children: [{
        type    : strong,
        children: [{
          type    : italic,
          children: ["bold>em"]
        }]
      }, {
        type    : italic,
        children: ["em"]
      }]
    }]
  )
}

for (const {type, c} of [
  {type: Token.ITALIC_AST, c: "*" },
  {type: Token.ITALIC_UND, c: "_" },
  {type: Token.STRONG_AST, c: "**"},
  {type: Token.STRONG_UND, c: "__"},
  {type: Token.STRIKE    , c: "~~"},
]) {
  let e = ""
  for (const char of c) {
    e += "\\" + char
  }

  testSingleWrite(
    labelToken(type),
    c + "foo" + c,
    [{
      type    : Token.PARAGRAPH,
      children: [{
        type    : type,
        children: ["foo"]
      }]
    }]
  )

  testSingleWrite(labelToken(type) + " space after begin",
    "a " + c + " b" + c,
    [{
      type    : Token.PARAGRAPH,
      children: ["a " + c + " b" + c]
    }]
  )

  testSingleWrite(labelToken(type) + " with Code",
    c + "`foo`" + c,
    [{
      type    : Token.PARAGRAPH,
      children: [{
        type    : type,
        children: [{
          type    : Token.CODE_INLINE,
          children: ["foo"]
        }]
      }]
    }]
  )

  testSingleWrite(labelToken(type) + " new Paragraph",
    "foo\n\n"+
		c + "bar" + c,
    [{
      type    : Token.PARAGRAPH,
      children: ["foo"],
    }, {
      type    : Token.PARAGRAPH,
      children: [{
        type    : type,
        children: ["bar"]
      }],
    }]
  )

  testSingleWrite(`Escape ${labelToken(type)} Begin`,
    e + "foo",
    [{
      type    : Token.PARAGRAPH,
      children: [c + "foo"]
    }]
  )

  testSingleWrite(`Escape ${labelToken(type)} End`,
    c + "foo" + e,
    [{
      type    : Token.PARAGRAPH,
      children: [{
        type    : type,
        children: ["foo" + c]
      }]
    }]
  )
}

testSingleWrite("Escape Backtick",
  "\\`" + "foo",
  [{
    type    : Token.PARAGRAPH,
    children: ["`" + "foo"]
  }]
)

testSingleWrite("Escape Backslash",
  "\\\\" + "foo",
  [{
    type    : Token.PARAGRAPH,
    children: ["\\" + "foo"]
  }]
)

testSingleWrite("Escape normal char",
  "\\a",
  [{
    type    : Token.PARAGRAPH,
    children: ["\\a"]
  }]
)

for (const url of [
  "http://example.com/page",
  "https://example.com/page",
]) {
  testSingleWrite("Raw URL " + url,
    url,
    [{
      type    : Token.PARAGRAPH,
      children: [{
        type    : Token.RAW_URL,
        attrs   : {[Attr.HREF]: url},
        children: [url],
      }]
    }]
  )

  testSingleWrite("Raw URL in text " + url,
    "foo "+url+" bar",
    [{	type    : Token.PARAGRAPH,
      children: [
        "foo ",
        {	type    : Token.RAW_URL,
          attrs   : {[Attr.HREF]: url},
          children: [url],
        },
        " bar",
      ]
    }]
  )

  testSingleWrite("Doesn't match urls in text",
    "foo"+url,
    [{
      type    : Token.PARAGRAPH,
      children: ["foo"+url]
    }],
  )
}

testSingleWrite("Doesn't match not_urls as urls",
  "http:/wrong.com",
  [{
    type    : Token.PARAGRAPH,
    children: ["http:/wrong.com"]
  }]
)

testSingleWrite("Link",
  "[title](url)",
  [{
    type    : Token.PARAGRAPH,
    children: [{
      type    : Token.LINK,
      attrs   : {[Attr.HREF]: "url"},
      children: ["title"],
    }]
  }]
)

testSingleWrite("Link with code",
  "[`title`](url)",
  [{
    type    : Token.PARAGRAPH,
    children: [{
      type    : Token.LINK,
      attrs   : {[Attr.HREF]: "url"},
      children: [{
        type    : Token.CODE_INLINE,
        children: ["title"],
      }],
    }]
  }]
)

testSingleWrite("Link new paragraph",
  "foo\n\n"+
	"[title](url)",
  [{
    type    : Token.PARAGRAPH,
    children: ["foo"]
  },{
    type    : Token.PARAGRAPH,
    children: [{
      type    : Token.LINK,
      attrs   : {[Attr.HREF]: "url"},
      children: ["title"],
    }]
  }]
)

testSingleWrite("Image",
  "![title](url)",
  [{
    type    : Token.PARAGRAPH,
    children: [{
      type    : Token.IMAGE,
      attrs   : {[Attr.SRC]: "url"},
      children: ["title"],
    }]
  }]
)

testSingleWrite("Image with code",
  "![`title`](url)",
  [{
    type    : Token.PARAGRAPH,
    children: [{
      type    : Token.IMAGE,
      attrs   : {[Attr.SRC]: "url"},
      children: ["`title`"],
    }]
  }]
)

testSingleWrite("Link with Image",
  "[![title](src)](href)",
  [{
    type    : Token.PARAGRAPH,
    children: [{
      type    : Token.LINK,
      attrs   : {[Attr.HREF]: "href"},
      children: [{
        type    : Token.IMAGE,
        attrs   : {[Attr.SRC]: "src"},
        children: ["title"],
      }],
    }]
  }]
)

testSingleWrite("Escaped link Begin",
  "\\[foo](url)",
  [{
    type    : Token.PARAGRAPH,
    children: ["[foo](url)"]
  }]
)

testSingleWrite("Escaped link End",
  "[foo\\](url)",
  [{
    type    : Token.PARAGRAPH,
    children: [{
      type    : Token.LINK,
      children: ["foo](url)"],
    }]
  }]
)

testSingleWrite("Un-Escaped link Both",
  "\\\\[foo\\\\](url)",
  [{
    type    : Token.PARAGRAPH,
    children: ["\\", {
      type    : Token.LINK,
      attrs   : {[Attr.HREF]: "url"},
      children: ["foo\\"],
    }]
  }]
)

testSingleWrite("Blockquote",
  "> foo",
  [{
    type    : Token.BLOCKQUOTE,
    children: [{
      type    : Token.PARAGRAPH,
      children: ["foo"],
    }]
  }]
)

testSingleWrite("Blockquote no-space",
  ">foo",
  [{
    type    : Token.BLOCKQUOTE,
    children: [{
      type    : Token.PARAGRAPH,
      children: ["foo"],
    }]
  }]
)

testSingleWrite("Blockquote Escape",
  "\\> foo",
  [{
    type    : Token.PARAGRAPH,
    children: ["> foo"],
  }]
)

testSingleWrite("Blockquote line break",
  "> foo\nbar",
  [{
    type    : Token.BLOCKQUOTE,
    children: [{
      type    : Token.PARAGRAPH,
      children: ["foo", br, "bar"],
    }]
  }]
)

testSingleWrite("Blockquote continued",
  "> foo\n> bar",
  [{
    type    : Token.BLOCKQUOTE,
    children: [{
      type    : Token.PARAGRAPH,
      children: ["foo", br, "bar"],
    }]
  }]
)

testSingleWrite("Blockquote end",
  "> foo\n\nbar",
  [{
    type    : Token.BLOCKQUOTE,
    children: [{
      type    : Token.PARAGRAPH,
      children: ["foo"],
    }]
  }, {
    type    : Token.PARAGRAPH,
    children: ["bar"],
  }]
)

testSingleWrite("Blockquote heading",
  "> # foo",
  [{
    type    : Token.BLOCKQUOTE,
    children: [{
      type    : Token.HEADING_1,
      children: ["foo"],
    }]
  }]
)

testSingleWrite("Blockquote codeblock",
  "> ```\nfoo\n```",
  [{
    type    : Token.BLOCKQUOTE,
    children: [{
      type    : Token.CODE_FENCE,
      children: ["foo"],
    }]
  }]
)

testSingleWrite("Blockquote blockquote",
  "> > foo",
  [{
    type    : Token.BLOCKQUOTE,
    children: [{
      type    : Token.BLOCKQUOTE,
      children: [{
        type    : Token.PARAGRAPH,
        children: ["foo"],
      }]
    }]
  }]
)

testSingleWrite("Blockquote up blockquote",
  "> foo\n"+
	"> > bar",
  [{
    type    : Token.BLOCKQUOTE,
    children: [{
      type    : Token.PARAGRAPH,
      children: ["foo"],
    }, {
      type    : Token.BLOCKQUOTE,
      children: [{
        type    : Token.PARAGRAPH,
        children: ["bar"],
      }]
    }]
  }]
)

testSingleWrite("Blockquote blockquote down",
  "> > foo\n"+
	"> \n"+
	"> bar",
  [{
    type    : Token.BLOCKQUOTE,
    children: [{
      type    : Token.BLOCKQUOTE,
      children: [{
        type    : Token.PARAGRAPH,
        children: ["foo"],
      }]
    }, {
      type    : Token.PARAGRAPH,
      children: ["bar"],
    }]
  }]
)

testSingleWrite("Blockquote blockquote continued",
  "> > foo\n"+
	"> >\n"+
	"> > bar",
  [{
    type    : Token.BLOCKQUOTE,
    children: [{
      type    : Token.BLOCKQUOTE,
      children: [{
        type    : Token.PARAGRAPH,
        children: ["foo"],
      }, {
        type    : Token.PARAGRAPH,
        children: ["bar"],
      }]
    }]
  }]
)

testSingleWrite("Blockquote up down",
  "> > foo\n"+
	">\n"+
	"> > bar",
  [{
    type    : Token.BLOCKQUOTE,
    children: [{
      type    : Token.BLOCKQUOTE,
      children: [{
        type    : Token.PARAGRAPH,
        children: ["foo"],
      }]
    }, {
      type    : Token.BLOCKQUOTE,
      children: [{
        type    : Token.PARAGRAPH,
        children: ["bar"],
      }]
    }]
  }]
)

testSingleWrite("Blockquote with code and line break",
  "> > `a\n"+
	"b`\n"+
	">\n"+
	"> > c",
  [{
    type    : Token.BLOCKQUOTE,
    children: [{
      type    : Token.BLOCKQUOTE,
      children: [{
        type    : Token.PARAGRAPH,
        children: [{
          type    : Token.CODE_INLINE,
          children: ["a", br, "b"],
        }]
      }]
    }, {
      type    : Token.BLOCKQUOTE,
      children: [{
        type    : Token.PARAGRAPH,
        children: ["c"],
      }],
    }]
  }]
)

const optimisticTests = [
  ["*",    Token.LIST_UNORDERED],
  ["-",    Token.LIST_UNORDERED],
  ["+",    Token.LIST_UNORDERED],
  ["1.",   Token.LIST_ORDERED],
  ["420.", Token.LIST_ORDERED],
] as const

for (const [c, token] of optimisticTests) {
  const listName = 
    token === Token.LIST_UNORDERED
      ? "List Unordered"
      : "List Ordered"

  const suffix = "; prefix: " + c

  const attrs = c === "420."
    ? {[Attr.START]: "420"}
    : undefined

  const indent       = " ".repeat(c.length + 1)
  const indentSmall = " ".repeat(c.length)

  testSingleWrite(listName + suffix,
    c+" foo",
    [{
      type    : token,
      attrs   : attrs,
      children: [{
        type    : Token.LIST_ITEM,
        children: ["foo"]
      }]
    }]
  )

  testSingleWrite(listName + " with italic" + suffix,
    c+" *foo*",
    [{
      type    : token,
      attrs   : attrs,
      children: [{
        type    : Token.LIST_ITEM,
        children: [{
          type    : Token.ITALIC_AST,
          children: ["foo"]
        }]
      }]
    }]
  )

  testSingleWrite(listName + " two items" + suffix,
    c+" a\n"+
		c+" b",
    [{
      type    : token,
      attrs   : attrs,
      children: [{
        type    : Token.LIST_ITEM,
        children: ["a"]
      }, {
        type    : Token.LIST_ITEM,
        children: ["b"]
      }]
    }]
  )

  testSingleWrite(listName + " with line break" + suffix,
    c+" a\nb",
    [{
      type    : token,
      attrs   : attrs,
      children: [{
        type    : Token.LIST_ITEM,
        children: ["a", br, "b"]
      }]
    }]
  )

  testSingleWrite(listName + " end" + suffix,
    c+" a\n"+
		"\n"+
		"b",
    [{
      type    : token,
      attrs   : attrs,
      children: [{
        type    : Token.LIST_ITEM,
        children: ["a"]
      }]
    }, {
      type    : Token.PARAGRAPH,
      children: ["b"]
    }]
  )

  testSingleWrite(listName + " after line break" + suffix,
    "a\n"+
		c+" b",
    [{
      type    : Token.PARAGRAPH,
      children: ["a"]
    }, {
      type    : token,
      attrs   : attrs,
      children: [{
        type    : Token.LIST_ITEM,
        children: ["b"]
      }]
    }]
  )

  testSingleWrite(listName + " with unchecked task" + suffix,
    c+" [ ] foo",
    [{
      type    : token,
      attrs   : attrs,
      children: [{
        type    : Token.LIST_ITEM,
        children: [{
          type    : Token.CHECKBOX,
          attrs: {[Attr.TYPE]: "checkbox"},
          children: [],
        }, " foo"]
      }]
    }]
  )

  testSingleWrite(listName + " with checked task" + suffix,
    c+" [x] foo",
    [{
      type    : token,
      attrs   : attrs,
      children: [{
        type    : Token.LIST_ITEM,
        children: [{
          type    : Token.CHECKBOX,
          attrs   : {[Attr.CHECKED]: "", [Attr.TYPE]: "checkbox"},
          children: [],
        }, " foo"]
      }]
    }]
  )

  testSingleWrite(listName + " with two tasks" + suffix,
    c+" [ ] foo\n"+
		c+" [x] bar\n",
    [{
      type    : token,
      attrs   : attrs,
      children: [{
        type    : Token.LIST_ITEM,
        children: [{
          type    : Token.CHECKBOX,
          attrs: {[Attr.TYPE]: "checkbox"},
          children: [],
        }, " foo"]
      }, {
        type    : Token.LIST_ITEM,
        children: [{
          type    : Token.CHECKBOX,
          attrs   : {[Attr.CHECKED]: "", [Attr.TYPE]: "checkbox"},
          children: [],
        }, " bar"]
      }]
    }]
  )

  testSingleWrite(listName + " with link" + suffix,
    c+" [x](url)",
    [{
      type    : token,
      attrs   : attrs,
      children: [{
        type    : Token.LIST_ITEM,
        children: [{
          type    : Token.LINK,
          attrs   : {[Attr.HREF]: "url"},
          children: ["x"],
        }]
      }]
    }]
  )

  testSingleWrite(listName + " nested list" + suffix,
    c+" a\n"+
		indent+c+" b",
    [{
      type    : token,
      attrs   : attrs,
      children: [{
        type    : Token.LIST_ITEM,
        children: ["a", {
          type    : token,
          attrs   : attrs,
          children: [{
            type    : Token.LIST_ITEM,
            children: ["b"]
          }]
        }]
      }]
    }]
  )

  testSingleWrite(listName + " failed nested list" + suffix,
    c+" a\n"+
		indentSmall+c+" b",
    [{
      type    : token,
      attrs   : attrs,
      children: [{
        type    : Token.LIST_ITEM,
        children: ["a"]
      }, {
        type    : Token.LIST_ITEM,
        children: ["b"]
      }]
    }]
  )

  testSingleWrite(listName + " nested ul multiple items" + suffix,
    c+" a\n"+
		indent+"* b\n"+
		indent+"* c\n",
    [{
      type    : token,
      attrs   : attrs,
      children: [{
        type    : Token.LIST_ITEM,
        children: ["a", {
          type    : Token.LIST_UNORDERED,
          children: [{
            type    : Token.LIST_ITEM,
            children: ["b"]
          }, {
            type    : Token.LIST_ITEM,
            children: ["c"]
          }]
        }]
      }]
    }]
  )

  testSingleWrite(listName + " nested and un-nested" + suffix,
    c+" a\n"+
		indent+"* b\n"+
		c+" c\n",
    [{
      type    : token,
      attrs   : attrs,
      children: [{
        type    : Token.LIST_ITEM,
        children: ["a", {
          type    : Token.LIST_UNORDERED,
          children: [{
            type    : Token.LIST_ITEM,
            children: ["b"]
          }]
        }]
      }, {
        type    : Token.LIST_ITEM,
        children: ["c"]
      }]
    }]
  )

  // test_single_write(list_name + " single line nesting" + suffix,
  // 	c+" * a",
  // 	[{
  // 		type    : token,
  // 		attrs   : attrs,
  // 		children: [{
  // 			type    : Token.List_Item,
  // 			children: [{
  // 				type    : Token.List_Unordered,
  // 				children: [{
  // 					type    : Token.List_Item,
  // 					children: ["a"]
  // 				}]
  // 			}]
  // 		}]
  // 	}]
  // )

  // test_single_write(list_name + " single line nesting continued" + suffix,
  // 	c+" * a\n"+
  // 	indent+"* b",
  // 	[{
  // 		type    : token,
  // 		attrs   : attrs,
  // 		children: [{
  // 			type    : Token.List_Item,
  // 			children: [{
  // 				type    : Token.List_Unordered,
  // 				children: [{
  // 					type    : Token.List_Item,
  // 					children: ["a"]
  // 				}, {
  // 					type    : Token.List_Item,
  // 					children: ["b"]
  // 				}]
  // 			}]
  // 		}]
  // 	}]
  // )
}

testSingleWrite("Failed nesting of ul in ol",
  "1. a\n"+
	"  * b",
  [{
    type    : Token.LIST_ORDERED,
    children: [{
      type    : Token.LIST_ITEM,
      children: ["a"]
    }]
  }, {
    type    : Token.LIST_UNORDERED,
    children: [{
      type    : Token.LIST_ITEM,
      children: ["b"]
    }]
  }]
)

// test_single_write("Heading in a list item",
// 	"- # foo",
// 	[{
// 		type    : Token.List_Unordered,
// 		children: [{
// 			type    : Token.List_Item,
// 			children: [{
// 				type    : Token.Heading_1,
// 				children: ["foo"]
// 			}]
// 		}]
// 	}]
// )