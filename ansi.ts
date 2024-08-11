// import { createLogRenderer } from "@/renderer/log"
import { createParser, endParser, writeToParser } from "@/parser"
import { readFile } from "fs/promises"
import { createANSIRenderer } from "@/renderer/ansi"

const source = await readFile("readme.md", "utf8")

// const renderer = createLogRenderer()
const renderer = createANSIRenderer()
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

console.log(parser)
console.log(parser.renderer.data.buffer)