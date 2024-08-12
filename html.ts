import { MarkdownHTMLStream } from "@/renderer"

const readme = Bun.file("readme.md")
const text = await new Response(readme.stream().pipeThrough(new MarkdownHTMLStream())).text()
console.log(text)

Bun.serve({
  async fetch (request) {
    console.log(request)
    return new Response(
      text , {
        headers: {
          "Content-Type": "text/html",
        }
      })
  }
})