import { expect, test, describe, afterAll } from "bun:test"
import { createParser, endParser, writeToParser } from "@/parser"
import { createANSIRenderer, MarkdownANSIStream } from "@/renderer/ansi"
import { readFile } from "fs/promises"
import chalk from "chalk"

// TODO: Investigate error produced between character 1800-1900

// Store the original chalk level
const originalChalkLevel = chalk.level
const encoder = new TextEncoder()

describe("Streaming Markdown Parser", () => {
  const testParser = async () => {
    let source = await readFile("readme.md", "utf8")
    source = source.slice(0, 1800)

    const renderer = createANSIRenderer({
      render: (chunk) => process.stdout.write(chunk),
    })

    const parser = createParser(renderer)

    let i = 0
    while (i < source.length) {
      const length = 16
      const chunk = source.slice(i, i += length)
      writeToParser(parser, chunk)
    }

    endParser(parser)
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
    // TODO: investigate
    const maxLength = 1200
    const outputStream = new WritableStream({
      write(chunk) {
        if (result.length <= maxLength) {
          result += decoder.decode(chunk)
        } else {
          stream.cancel()
        }
      }
    })

    await stream.pipeThrough(new MarkdownANSIStream()).pipeTo(outputStream)

    // You might want to create a separate snapshot for this stream output
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
    // Restore the original chalk level
    chalk.level = originalChalkLevel
  })
})