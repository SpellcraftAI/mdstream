import { createParser, endParser, writeToParser } from "@/parser"
import { readFile } from "fs/promises"
import { createHTMLRenderer } from "@/renderer/html" // Assuming we've named our new renderer file as "html.ts"

async function testHTMLRenderer() {
  const source = await readFile("readme.md", "utf8")

  const renderer = createHTMLRenderer({
    render: (chunk) => process.stdout.write(chunk),
  })

  const parser = createParser(renderer)

  let i = 0
  while (i < source.length) {
    const length = 16
    const delay = Math.floor(Math.random() * 20) + 4
    const chunk = source.slice(i, i += length)
    await new Promise(resolve => setTimeout(resolve, delay))
    writeToParser(parser, chunk)
  }

  endParser(parser)

  console.log("\n\n--- Parser Object ---")
  console.log(parser)
  console.log("\n--- Full HTML Output ---")
  // console.log(parser.renderer.data.buffer)
}

testHTMLRenderer().catch(console.error)