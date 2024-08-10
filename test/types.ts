import type { Renderer } from "@/renderer/types"
import type { Token } from "@/tokens"
import type { Children, NodeAttrs } from "@/types"

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