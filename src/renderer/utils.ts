import { Attr } from "@/tokens"

export const AttrLabel: Readonly<Record<Attr, string>> = {
  [Attr.HREF]: "href",
  [Attr.SRC]: "src",
  [Attr.LANG]: "lang",
  [Attr.CHECKED]: "checked",
  [Attr.START]: "start"
} as const

export function serializeAttr(type: Attr): typeof AttrLabel[Attr] {
  return AttrLabel[type]
}
