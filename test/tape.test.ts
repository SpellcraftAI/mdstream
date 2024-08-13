import { test, expect } from "bun:test"

import { MarkdownLogStream } from "../src/renderer"

const encoder = new TextEncoder()

test("Tape of parser operations should match", async () => {
  const readme = Bun.file("readme.md")
  const parsed = await new Response(readme.stream().pipeThrough(new MarkdownLogStream(0))).text()
  const encoded = encoder.encode(parsed)
  // console.log(parsed)

  expect(encoded).toMatchSnapshot()
})