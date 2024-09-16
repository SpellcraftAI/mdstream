import { expect, test, describe } from "bun:test"
import { readFile } from "fs/promises"

import { createANSIRenderer, MarkdownANSIStream } from "."
import { createParser, parse, finish } from "../parser"
import type { ColorSupportLevel } from "../chalk"
import { resolve } from "path"

const encoder = new TextEncoder()

describe("Streaming Markdown Parser", () => {
  const testParser = async (level: ColorSupportLevel) => {
    let source = await readFile("readme.md", "utf8")
    let buffer = ""
    const renderer = createANSIRenderer({
      render: (chunk) => {
        buffer += chunk
        process.stdout.write(chunk)
      },
      level
    })

    const parser = createParser(renderer)

    let i = 0
    while (i < source.length) {
      const length = 16
      const chunk = source.slice(i, i += length)
      parse(parser, chunk)
    }

    finish(parser)
    return buffer
  }

  test("ANSI parser [color]", async () => {
    const result = await testParser(1)
    expect(encoder.encode(result)).toMatchSnapshot("ansi-force-color")
  })

  test("ANSI parser [no color]", async () => {
    const result = await testParser(0)
    expect(encoder.encode(result)).toMatchSnapshot("ansi-force-no-color")
  })

  const testStream = async (level: ColorSupportLevel) => {
    const decoder = new TextDecoder()
    const file = Bun.file("readme.md")
    const stream = file.stream()

    let result = ""
    const outputStream = new WritableStream({
      write(chunk) {
        result += decoder.decode(chunk)
      }
    })

    await stream.pipeThrough(new MarkdownANSIStream(level)).pipeTo(outputStream)
    return result
  }

  test("MarkdownANSIStream [color]", async () => {
    const result = await testStream(1)
    expect(encoder.encode(result)).toMatchSnapshot("markdown-ansi-stream-color")
  })

  test("MarkdownANSIStream [no color]", async () => {
    const result = await testStream(0)
    expect(encoder.encode(result)).toMatchSnapshot("markdown-ansi-stream-no-color")
  })

  test.only("Code blocks inside of lists", async () => {
    const input = await new Response(Bun.file(new URL("ansi.test.md", import.meta.url))).text()
    // const input = "1. Here's a Python function to greet someone:\n   ```python\n   def greet(name):\n       return f\"Hello, {name}!\"\n   \n   print(greet(\"World\"))\n   ```\n\n2. Now"
    // const input = "\`\`\`js\nbacktick: \`\n\`\`\`"
    //     const input = `### \`parse\` function

    // Test

    // \`\`\`js
    // parse(parser, "# Streaming Markdown\\n\\n")
    // \`\`\`
    // `

    let buffer = ""
    const renderedChunks: string[] = []
  
    const renderer = createANSIRenderer({
      render: (chunk) => {
        // process.stdout.write(chunk)
        buffer += chunk
        console.log("RENDER", JSON.stringify(chunk))
        renderedChunks.push(chunk)
      },
      level: 3 // Force color
    })
  
    const parser = createParser(renderer)
    const chunkSize = 5  

    // Parse the input in small chunks to simulate streaming
    for (let i = 0; i < input.length; i += chunkSize) {
      const chunk = input.slice(i, i + chunkSize)
      console.log("PARSE  ", JSON.stringify(chunk))
      parse(parser, chunk)
    }
  
    finish(parser)
    process.stdout.write(buffer)
  
    // Snapshot the array of input chunks
    expect(renderedChunks).toMatchSnapshot("optimistic-code-block-parsing-input-chunks")
  })
})