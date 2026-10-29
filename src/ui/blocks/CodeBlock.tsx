import React, { useEffect, useRef, useState } from "react";
import { Check, Code2, Copy } from "lucide-react";

interface Token {
  text: string;
  kind?:
    | "comment"
    | "string"
    | "number"
    | "keyword"
    | "literal"
    | "function"
    | "type"
    | "meta";
}

const KEYWORDS: Record<string, Set<string>> = {
  js: new Set(
    "await async break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while with yield".split(
      " ",
    ),
  ),
  json: new Set(),
  go: new Set(
    "break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var".split(
      " ",
    ),
  ),
  python: new Set(
    "and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield".split(
      " ",
    ),
  ),
  bash: new Set(
    "case do done elif else esac fi for function if in select then until while".split(
      " ",
    ),
  ),
  sql: new Set(
    "select from where group by order having join left right inner outer on insert into values update set delete create table alter drop index and or not null as limit offset union all distinct".split(
      " ",
    ),
  ),
  css: new Set(),
};
const ALIASES: Record<string, string> = {
  javascript: "js",
  jsx: "js",
  ts: "js",
  typescript: "js",
  tsx: "js",
  golang: "go",
  py: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  postgres: "sql",
  postgresql: "sql",
  mysql: "sql",
  html: "plain",
  xml: "plain",
  yml: "plain",
  yaml: "plain",
  text: "plain",
  plaintext: "plain",
};
const LITERALS = new Set([
  "true",
  "false",
  "null",
  "undefined",
  "nil",
  "None",
  "True",
  "False",
  "NaN",
  "Infinity",
]);
const HASH_COMMENT = new Set(["python", "bash"]);
const DASH_COMMENT = new Set(["sql"]);

function tokenize(code: string, language: string): Token[] {
  const lang = ALIASES[language.toLowerCase()] ?? language.toLowerCase();
  if (lang === "plain") return [{ text: code }];
  const keywords = KEYWORDS[lang] ?? new Set<string>();
  const pattern =
    /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|--[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b0[xX][0-9a-fA-F]+\b|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+)|([^\s])/g;
  const tokens: Token[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(code))) {
    if (match.index > last)
      tokens.push({ text: code.slice(last, match.index) });
    const [text, comment, string, number, word] = match;
    last = match.index + text.length;
    if (comment !== undefined) {
      const hash = text.startsWith("#");
      const dash = text.startsWith("--");
      const allowed =
        (!hash || HASH_COMMENT.has(lang)) && (!dash || DASH_COMMENT.has(lang));
      tokens.push({ text, kind: allowed ? "comment" : undefined });
    } else if (string !== undefined) tokens.push({ text, kind: "string" });
    else if (number !== undefined) tokens.push({ text, kind: "number" });
    else if (word !== undefined)
      tokens.push({
        text,
        kind: keywords.has(word)
          ? "keyword"
          : LITERALS.has(word)
            ? "literal"
            : undefined,
      });
    else tokens.push({ text });
  }
  if (last < code.length) tokens.push({ text: code.slice(last) });
  const isBlank = (token: Token) => token.kind === undefined && !token.text.trim();
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.kind !== undefined) continue;
    if (!/^[A-Za-z_$][\w$]*$/.test(token.text)) continue;
    let next: Token | undefined;
    for (let probe = index + 1; probe < tokens.length; probe += 1) {
      if (isBlank(tokens[probe]!)) continue;
      next = tokens[probe];
      break;
    }
    if (next?.text.startsWith("(")) token.kind = "function";
    else if (/^[A-Z][A-Za-z0-9_]*$/.test(token.text)) token.kind = "type";
  }
  return tokens;
}

function splitLines(tokens: Token[]): Token[][] {
  const lines: Token[][] = [[]];
  for (const token of tokens) {
    const pieces = token.text.split("\n");
    pieces.forEach((piece, index) => {
      if (index > 0) lines.push([]);
      if (piece)
        lines[lines.length - 1]!.push({ text: piece, kind: token.kind });
    });
  }
  return lines;
}

const LABELS: Record<string, string> = {
  js: "JavaScript",
  json: "JSON",
  go: "Go",
  python: "Python",
  bash: "Shell",
  sql: "SQL",
  css: "CSS",
  html: "HTML",
};

export function CodeBlock({
  code,
  language,
  title,
  lineNumbers,
}: {
  code: string;
  language?: string;
  title?: string;
  lineNumbers?: boolean;
}) {
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const languageKey = (language ?? "").toLowerCase();
  const lang = ALIASES[languageKey] ?? languageKey;
  const label = LABELS[lang] ?? (language ? language : "Code");
  const lines = splitLines(tokenize(code, languageKey));
  const gutter = lineNumbers ?? lines.length > 12;
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied("idle"), 2200);
  };
  return (
    <figure className="ru-code">
      <figcaption className="ru-code-head">
        <span className="ru-code-lang">
          <Code2 size={14} aria-hidden="true" />
          {label}
        </span>
        {title ? <span className="ru-code-title">{title}</span> : null}
        <button
          type="button"
          className="ru-code-copy"
          onClick={() => void copy()}
          aria-label="Copy code"
          title={copied === "done" ? "Copied" : "Copy code"}
        >
          {copied === "done" ? <Check size={15} /> : <Copy size={15} />}
          <span className="ru-sr-only" aria-live="polite">
            {copied === "done"
              ? "Copied"
              : copied === "failed"
                ? "Failed"
                : "Copy"}
          </span>
        </button>
      </figcaption>
      <pre>
        <code>
          {lines.map((line, index) => (
            <span className="ru-code-line" key={index}>
              {gutter && (
                <span className="ru-code-number" aria-hidden="true">
                  {index + 1}
                </span>
              )}
              <span className="ru-code-text">
                {line.length === 0
                  ? "\u00a0"
                  : line.map((token, position) =>
                      token.kind ? (
                        <span key={position} className={`ru-tok-${token.kind}`}>
                          {token.text}
                        </span>
                      ) : (
                        <React.Fragment key={position}>
                          {token.text}
                        </React.Fragment>
                      ),
                    )}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}
