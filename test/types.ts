import type { Renderer } from "@/renderer"
import type { Token } from "@/tokens"
import type { Children, NodeAttrs } from "@/types"

export type Parent_Map = Map<TestRendererNode, TestRendererNode>;

export interface TestRendererData {
  root: TestRendererNode;
  node: TestRendererNode;
  parent_map: Parent_Map;
}

export interface TestRendererNode {
  type: Token;
  children: Children<string | TestRendererNode>;
  attrs?: NodeAttrs;
}

export type TestRenderer = Renderer<TestRendererData>;