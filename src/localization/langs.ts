import type { Language } from "./language";

export default [
  {
    key: "zh-CN",
    nativeName: "简体中文",
    prefix: "ZH-CN",
  },
  {
    key: "en",
    nativeName: "English",
    prefix: "EN-US",
  },
] as const satisfies Language[];
