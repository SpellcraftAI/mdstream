import { expect, test, describe, afterAll } from "bun:test"
import { createParser, parse, finish } from "@/parser"
import { createANSIRenderer, MarkdownANSIStream } from "@/renderer/ansi"
import { readFile } from "fs/promises"
import chalk from "chalk"

const originalChalkLevel = chalk.level
const encoder = new TextEncoder()

describe("Streaming Markdown Parser", () => {
  const testParser = async () => {
    let source = await readFile("readme.md", "utf8")
    const renderer = createANSIRenderer({
      render: (chunk) => process.stdout.write(chunk),
    })

    const parser = createParser(renderer)

    let i = 0
    while (i < source.length) {
      const length = 16
      const chunk = source.slice(i, i += length)
      parse(parser, chunk)
    }

    finish(parser)
    return parser.renderer.data.buffer
  }

  test("should correctly parse and render markdown with color", async () => {
    chalk.level = 1
    const result = await testParser()
    expect(encoder.encode(result)).toMatchSnapshot("ansi-force-color")
  })

  test("should correctly parse and render markdown without color", async () => {
    chalk.level = 0
    const result = await testParser()
    expect(encoder.encode(result)).toMatchSnapshot("ansi-force-no-color")
  })

  const testStream = async () => {
    const decoder = new TextDecoder()
    const file = Bun.file("readme.md")
    const stream = file.stream()

    let result = ""
    const outputStream = new WritableStream({
      write(chunk) {
        result += decoder.decode(chunk)
      }
    })

    await stream.pipeThrough(new MarkdownANSIStream()).pipeTo(outputStream)
    return result
  }

  test("should correctly process markdown through MarkdownANSIStream", async () => {
    chalk.level = 1
    const result = await testStream()
    expect(encoder.encode(result)).toMatchSnapshot("markdown-ansi-stream-color")
  })

  test("should correctly process markdown through MarkdownANSIStream", async () => {
    chalk.level = 0
    const result = await testStream()
    expect(encoder.encode(result)).toMatchSnapshot("markdown-ansi-stream-no-color")
  })

  afterAll(() => {
    chalk.level = originalChalkLevel
  })
})