import { Token, Attr } from "../tokens"

export type Children<T = string> = Array<T>
export type NodeAttrs = {[key in Attr]?: string};

// Renderer types
export type RendererAddToken<T> = (data: T, type: Token, attrs?: NodeAttrs) => void;
export type RendererEndToken<T> = (data: T, type: Token) => void;
export type RendererSetAttr<T> = (data: T, type: Attr, value: string) => void;
export type RendererAddText<T> = (data: T, type: Token, text: string) => void;

export interface Renderer<T> {
    data: T;
    addToken: RendererAddToken<T>;
    endToken: RendererEndToken<T>;
    addText: RendererAddText<T>;
    setAttr: RendererSetAttr<T>;
}