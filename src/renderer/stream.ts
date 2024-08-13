import { finish, parse, type Parser } from "../parser"

export interface MarkdownStreamOptions<T> {
  start: (controller: TransformStreamDefaultController<Uint8Array>) => Parser<T> | Promise<Parser<T>>
}

export class MarkdownStream<T = undefined> extends TransformStream<Uint8Array, Uint8Array> {
  constructor({ start }: MarkdownStreamOptions<T>) {
    const DECODER = new TextDecoder()
    let parser: Parser<T>
    
    super({
      start: async (controller) => {
        parser = await start(controller)
      },

      transform: (chunk) => {
        const source = DECODER.decode(chunk)
        parse(parser, source)
      },

      flush() {
        finish(parser)
      }
    })
  }
}