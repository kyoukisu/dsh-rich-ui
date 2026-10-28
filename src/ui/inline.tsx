import React from "react";

const LINK = /^\[([^\]]{1,120})\]\((https?:\/\/[^\s)]{1,2048})\)$/;
const TOKEN =
  /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]{1,120}\]\(https?:\/\/[^\s)]{1,2048}\))/g;

function safeHttp(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * The renderer supports exactly three inline marks: code, bold and an explicit
 * http(s) link. Anything else stays literal text, so a model cannot smuggle
 * markup or a non-web scheme into the answer.
 */
export function Inline({ text }: { text: string }) {
  const parts = text.split(TOKEN).filter((part) => part !== "");
  return (
    <>
      {parts.map((part, index) => {
        if (part.length > 2 && part.startsWith("`") && part.endsWith("`"))
          return <code key={index}>{part.slice(1, -1)}</code>;
        if (part.length > 4 && part.startsWith("**") && part.endsWith("**"))
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        const link = LINK.exec(part);
        if (link && safeHttp(link[2]))
          return (
            <a
              key={index}
              href={link[2]}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link[1]}
            </a>
          );
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}
