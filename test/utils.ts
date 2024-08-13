import type { TestRenderer, TestRendererNode } from "./types"
import { expect } from "bun:test"

import { Token } from "../src/tokens"
import type { Children } from "../src/renderer/types"
import { labelToken } from "../src/renderer/log"

export function createTestRenderer(): TestRenderer {
  const root: TestRendererNode = {
    type: Token.DOCUMENT,
    children: []
  }
  return {
    addToken: (data, type) => {
      const node: TestRendererNode = { type, children: [] }
      data.node.children.push(node)
      data.parentMap.set(node, data.node)
      data.node = node
    },
    endToken: (data) => {
      const parent = data.parentMap.get(data.node)
      // notEqual(parent, undefined, "Parent not found");
      expect(parent, "Parent not found").not.toBe(undefined)
      data.node = parent as TestRendererNode
    },
    setAttr: (data, type, value) => {
      if (data.node.attrs === undefined) {
        data.node.attrs = { [type]: value }
      } else {
        data.node.attrs[type] = value
      }
    },
    addText: (data, text) => {
      const lastChild = data.node.children[data.node.children.length - 1]
      if (typeof lastChild === "string") {
        data.node.children[data.node.children.length - 1] = lastChild + text
      } else {
        data.node.children.push(text)
      }
    },
    data: {
      parentMap: new Map(),
      root: root,
      node: root,
    },
  }
}

export function comparePad(len: number, h: number): string {
  let txt = ""
  if (h < 0) {
    txt += "\u001b[31m"
  } else if (h > 0) {
    txt += "\u001b[32m"
  } else {
    txt += "\u001b[30m"
  }
  for (let i = 0; i <= len; i += 1) {
    txt += ": "
  }
  txt += "\u001b[0m"
  return txt
}

export function comparePushTest(text: string, lines: string[], len: number, h: number): void {
  lines.push(comparePad(len, h) + JSON.stringify(text))
}

export function comparePushNode(node: TestRendererNode, lines: string[], len: number, h: number): void {
  comparePushType(node.type, lines, len, h)
  for (const child of node.children) {
    if (typeof child === "string") {
      comparePushTest(child, lines, len + 1, h)
    } else {
      comparePushNode(child, lines, len + 1, h)
    }
  }
}

export function comparePushType(type: Token, lines: string[], len: number, h: number): void {
  lines.push(comparePad(len, h) + "\u001b[36m" + labelToken(type) + "\u001b[0m")
}

export function compareChild<T extends string | TestRendererNode>(
  actual: T | undefined, 
  expected: T | undefined, 
  lines: string[], 
  len: number
): boolean {
  if (actual === undefined) {
    if (expected === undefined) return true

    if (typeof expected === "string") {
      comparePushTest(expected, lines, len, -1)
    } else {
      comparePushNode(expected, lines, len, -1)
    }

    return false
  }

  if (expected === undefined) {
    if (typeof actual === "string") {
      comparePushTest(actual, lines, len, +1)
    } else {
      comparePushNode(actual, lines, len, +1)
    }

    return false
  }

  if (typeof actual === "string") {
    if (typeof expected === "string") {
      if (actual === expected) {
        comparePushTest(expected, lines, len, 0)
        return true
      }

      comparePushTest(actual,   lines, len, +1)
      comparePushTest(expected, lines, len, -1)
      return false
    }

    comparePushTest(actual, lines, len, +1)
    comparePushNode(expected, lines, len, -1)
    return false
  }

  if (typeof expected === "string") {
    comparePushTest(expected, lines, len, -1)
    comparePushNode(actual, lines, len, +1)
    return false
  }

  if (actual.type === expected.type) {
    comparePushType(actual.type, lines, len, 0)
  } else {
    comparePushType(actual.type, lines, len, +1)
    comparePushType(expected.type, lines, len, -1)
    return false
  }

  if (JSON.stringify(actual.attrs) !== JSON.stringify(expected.attrs)) {
    comparePushTest(JSON.stringify(actual.attrs),   lines, len + 1, +1)
    comparePushTest(JSON.stringify(expected.attrs), lines, len + 1, -1)
    return false
  }

  return compareChildren(actual.children, expected.children, lines, len + 1)
}

export function compareChildren<T extends string | TestRendererNode>(
  children: Children<T>, 
  expectedChildren: Children<T>, 
  lines: string[], 
  len: number
): boolean {
  let result = true

  let i = 0
  for (; i < children.length; i += 1) {
    result = compareChild(children[i], expectedChildren[i], lines, len) && result
  }

  for (; i < expectedChildren.length; i += 1) {
    compareChild(undefined, expectedChildren[i], lines, len)
    result = false
  }

  return result
}

export function expectChildren<T extends string | TestRendererNode>(
  children: Children<T>, 
  expectedChildren: Children<T>
): void {
  const lines: string[] = []
  const result = compareChildren(children, expectedChildren, lines, 0)
  if (!result) {
    const stl = Error.stackTraceLimit
    Error.stackTraceLimit = 0
    const e = new Error("Children not equal:\n" + lines.join("\n") + "\n")
    Error.stackTraceLimit = stl
    throw e
  }
}