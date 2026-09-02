import { type ReactNode } from "react";

export function formatUserText(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "");
}

export function DiscordMarkdown({ text }: { text: string }) {
  const lines = formatUserText(text).split("\n");
  return (
    <div className="whitespace-pre-wrap break-words">
      {lines.map((line, i) => (
        <span key={i}>
          {i > 0 ? <br /> : null}
          {parseInline(line, `${i}-`)}
        </span>
      ))}
    </div>
  );
}

function parseInline(text: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let i = 0;
  let buf = "";
  let n = 0;
  const flush = () => {
    if (!buf) return;
    nodes.push(buf);
    buf = "";
  };
  while (i < text.length) {
    const rest = text.slice(i);
    const match =
      matchAt(rest, /^\|\|([\s\S]+?)\|\|/, "spoiler") ||
      matchAt(rest, /^`([^`]+)`/, "code") ||
      matchAt(rest, /^\*\*([\s\S]+?)\*\*/, "bold") ||
      matchAt(rest, /^__([\s\S]+?)__/, "underline") ||
      matchAt(rest, /^~~([\s\S]+?)~~/, "strike") ||
      matchAt(rest, /^\*(?!\*)([\s\S]+?)\*(?!\*)/, "italic") ||
      matchAt(rest, /^_(?!_)([\s\S]+?)_(?!_)/, "italic");
    if (!match) {
      buf += text[i];
      i += 1;
      continue;
    }
    flush();
    const id = `${key}${n++}`;
    nodes.push(wrapToken(match.kind, match.inner, id));
    i += match.raw.length;
  }
  flush();
  return nodes;
}

function matchAt(rest: string, re: RegExp, kind: TokenKind): { kind: TokenKind; inner: string; raw: string } | null {
  const m = rest.match(re);
  if (!m) return null;
  return { kind, inner: m[1] ?? "", raw: m[0] };
}

type TokenKind = "spoiler" | "code" | "bold" | "underline" | "strike" | "italic";

function wrapToken(kind: TokenKind, inner: string, key: string): ReactNode {
  const children = kind === "code" ? inner : parseInline(inner, `${key}-`);
  switch (kind) {
    case "bold":
      return (
        <strong key={key} className="font-bold text-[#f2f3f5]">
          {children}
        </strong>
      );
    case "italic":
      return (
        <em key={key} className="italic">
          {children}
        </em>
      );
    case "underline":
      return (
        <span key={key} className="underline">
          {children}
        </span>
      );
    case "strike":
      return (
        <s key={key} className="text-[#b5bac1]">
          {children}
        </s>
      );
    case "code":
      return (
        <code key={key} className="rounded bg-[#1e1f22] px-1 py-0.5 font-mono text-[13px] text-[#dbdee1]">
          {inner}
        </code>
      );
    case "spoiler":
      return (
        <span
          key={key}
          className="cursor-pointer rounded bg-[#1e1f22] px-0.5 text-transparent transition hover:bg-[#3f4147] hover:text-[#dbdee1]"
          title="Spoiler — draufhalten"
        >
          {children}
        </span>
      );
  }
}
