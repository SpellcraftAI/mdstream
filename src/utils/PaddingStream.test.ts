import { expect, test, describe } from "bun:test"
import { PaddingStream } from "./PaddingStream"

const ENCODER = new TextEncoder()
const DECODER = new TextDecoder()

describe("PaddingStream", () => {
  test("formats multi-line chunks correctly", async () => {
    const paddingStream = new PaddingStream({ space: "*", startPad: 2, endPad: 2 })
    const inputChunks = [
      "function hello() {\n",
      "  console.log('Hello,",
      " World!');\n",
      "  console.l",
      "og('abcxyz');\n",
      "}\n",
      "\n",
      "function bye() {}"
    ]

    let fullResult = ""
    const formattedChunks: string[] = []

    const readableStream = new ReadableStream<string>({
      start(controller) {
        for (const chunk of inputChunks) {
          controller.enqueue(chunk)
        }
        controller.close()
      }
    })

    const writableStream = new WritableStream<Uint8Array>({
      write(chunk) {
        const text = DECODER.decode(chunk)
        fullResult += text
        formattedChunks.push(text)
      }
    })

    await readableStream
      .pipeThrough(
        new TransformStream<string, Uint8Array>({
          transform: (chunk, controller) => {
            controller.enqueue(ENCODER.encode(chunk))
          },
        })
      )
      .pipeThrough(paddingStream)
      .pipeTo(writableStream)

    // Verify full result buffer
    expect(fullResult).toMatchSnapshot()
    console.log(fullResult)

    // Verify each chunk
    formattedChunks.forEach((chunk, index) => {
      expect(chunk).toMatchSnapshot(`Chunk ${index + 1}`)
    })
  })
})