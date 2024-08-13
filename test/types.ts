import type { Renderer } from "../src/renderer/types"
import type { Token } from "../src/tokens"
import type { Children, NodeAttrs } from "../src/types"

export type ParentMap = Map<TestRendererNode, TestRendererNode>;

export interface TestRendererData {
  root: TestRendererNode;
  node: TestRendererNode;
  parentMap: ParentMap;
}

export interface TestRendererNode {
  type: Token;
  children: Children<string | TestRendererNode>;
  attrs?: NodeAttrs;
}

export type TestRenderer = Renderer<TestRendererData>;