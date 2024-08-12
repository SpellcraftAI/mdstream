import { test, expect } from "bun:test"
import { MarkdownLogStream } from "@/renderer/log"
import chalk from "chalk"

const encoder = new TextEncoder()

test("Tape of parser operations should match", async () => {
  chalk.level = 0
  const readme = Bun.file("readme.md")
  const parsed = await new Response(readme.stream().pipeThrough(new MarkdownLogStream())).text()
  const encoded = encoder.encode(parsed)

  expect(encoded).toMatchSnapshot()
})