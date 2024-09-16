import type { Renderer } from "../renderer"
import type { Token } from "../tokens"

export interface Parser<T> {
  token: Token;
  renderer: Renderer<T>;
  text: string;
  pending: string;
  tokens: Uint32Array;
  len: number;
  spaces: Uint8Array;
  indent: string;
  indentLength: number;
  codeFenceBody: 0 | 1;
  backticksCount: number;
  blockquoteIndex: number;
  hrChar: string;
  hrChars: number;

  escaped: boolean;
  doubleBacktickCode: boolean;
}
