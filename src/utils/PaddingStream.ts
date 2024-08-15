export interface PaddingOptions {
  startPad?: number;
  endPad?: number;
  space?: string;
}

export class Padding {
  private currentLine: string = ""
  private firstChunk: boolean = true
  private lastLineLength: number = 0

  constructor(
    private startPad: number,
    private endPad: number,
    private space: string
  ) {}

  processChunk(text: string): string {
    let result = ""

    for (const char of text) {
      if (char !== "\n") {
        this.currentLine += char
        continue
      }

      const newline = `\n${this.space.repeat(this.startPad)}`
      const formattedLine = this.formatLine(
        this.currentLine,
        this.firstChunk ? this.startPad : 0,
        this.endPad
      )

      /**
       * Pad empty lines with spaces to match the length of the last line.
       */

      const emptyLine = this.currentLine.trim().length === 0
      result += formattedLine
      if (emptyLine) {
        result += this.space.repeat(this.lastLineLength)
      }
      result += newline

      this.lastLineLength = this.currentLine.length
      this.currentLine = ""
      this.firstChunk = false
    }

    return result
  }

  flush(): string {
    if (this.currentLine.length > 0) {
      return this.formatLine(this.currentLine, 0, this.endPad)
    }
    return ""
  }

  private formatLine(line: string, start: number = 0, end: number = 0): string {
    return this.space.repeat(start) + line + this.space.repeat(end)
  }
}

export class PaddingStream extends TransformStream<Uint8Array, Uint8Array> {
  private encoder = new TextEncoder()
  private decoder = new TextDecoder()

  constructor({ startPad = 1, endPad = 1, space = " " }: PaddingOptions = {}) {
    let paddingLogic: Padding

    super({
      start: () => {
        paddingLogic = new Padding(startPad, endPad, space)
      },
      transform: (chunk, controller) => {
        const text = this.decoder.decode(chunk, { stream: true })
        const processedText = paddingLogic.processChunk(text)
        if (processedText.length > 0) {
          controller.enqueue(this.encoder.encode(processedText))
        }
      },
      flush: (controller) => {
        const finalText = paddingLogic.flush()
        if (finalText.length > 0) {
          controller.enqueue(this.encoder.encode(finalText))
        }
      },
    })
  }
}