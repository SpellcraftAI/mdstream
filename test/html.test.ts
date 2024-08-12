import { test, expect } from "bun:test"
import { MarkdownHTMLStream } from "../src/renderer"

const encoder = new TextEncoder()

test("HTML renderer should work for streams", async () => {
  const readme = Bun.file("readme.md")
  const parsed = await new Response(readme.stream().pipeThrough(new MarkdownHTMLStream())).text()
  const encoded = encoder.encode(parsed)

  console.log(parsed)
  expect(encoded).toMatchSnapshot()
})