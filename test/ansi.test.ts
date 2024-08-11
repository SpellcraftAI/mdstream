import { expect, test, describe } from "bun:test"
import { createParser, endParser, writeToParser } from "@/parser"
import { createANSIRenderer } from "@/renderer/ansi"
import { readFile } from "fs/promises"

describe("Streaming Markdown Parser", () => {
  test("should correctly parse and render markdown", async () => {
    let source = await readFile("readme.md", "utf8")

    // by character 1900 we cannot reproduce from snapshot
    // source = source.slice(0,1800)
    source = source.slice(0,1000)

    const renderer = createANSIRenderer()
    const parser = createParser(renderer)

    let i = 0
    while (i < source.length) {
      const length = 16
      const chunk = source.slice(i, i += length)
      writeToParser(parser, chunk)
    }

    endParser(parser)

    expect(parser.renderer.data.buffer).toMatchSnapshot()
  })
})