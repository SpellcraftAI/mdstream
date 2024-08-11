import { writeToParser, type Parser } from "@/parser"

export interface MarkdownStreamOptions<T> {
  start: (controller: TransformStreamDefaultController<Uint8Array>) => Parser<T> | Promise<Parser<T>>
}

export class MarkdownStream<T> extends TransformStream<Uint8Array, Uint8Array> {
  constructor({ start }: MarkdownStreamOptions<T>) {
    const DECODER = new TextDecoder()
    let parser: Parser<T>
    
    super({
      start: async (controller) => {
        parser = await start(controller)
      },

      transform: (chunk) => {
        const source = DECODER.decode(chunk)
        writeToParser(parser, source)
      }
    })
  }
}