import { expect, test, describe, afterAll } from "bun:test"
import { createParser, endParser, writeToParser } from "@/parser"
import { createANSIRenderer } from "@/renderer/ansi"
import { readFile } from "fs/promises"
import chalk from "chalk"

// TODO: Investigate error produced between character 1800-1900

// Store the original chalk level
const originalChalkLevel = chalk.level

describe("Streaming Markdown Parser", () => {
  const testParser = async (useColor: boolean) => {
    chalk.level = useColor ? 1 : 0

    let source = await readFile("readme.md", "utf8")
    source = source.slice(0, 1800)

    const renderer = createANSIRenderer()
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
    const result = await testParser(true)
    expect(result).toMatchSnapshot("force-color")
  })

  test("should correctly parse and render markdown without color", async () => {
    const result = await testParser(false)
    expect(result).toMatchSnapshot("force-no-color")
  })

  afterAll(() => {
    // Restore the original chalk level
    chalk.level = originalChalkLevel
  })
})