import React from "react";
import { ArrowUpRight } from "lucide-react";
import type { Entity } from "../core/schema";

const LINK = /^\[([^\]]{1,120})\]\((https?:\/\/[^\s)]{1,2048})\)$/;
const ENTITY = /^\[\[([A-Za-z_][A-Za-z0-9_-]{0,63})\]\]$/;
const TOKEN =
  /(`[^`]+`|\*\*[^*]+\*\*|\[\[[A-Za-z_][A-Za-z0-9_-]{0,63}\]\]|\[[^\]]{1,120}\]\(https?:\/\/[^\s)]{1,2048}\))/g;

function safeHttp(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export interface InlineProps {
  text: string;
  /** Declared entities, used to resolve `[[id]]` chips. */
  entities?: Entity[];
  /** Opens a resolved entity; without it the chip stays static. */
  onEntity?: (id: string) => void;
}

/**
 * Four inline marks: code, bold, an explicit http(s) link, and `[[entityId]]`
 * for a declared entity. Anything else stays literal, so a model cannot smuggle
 * markup or a non-web scheme into the answer.
 */
export function Inline({ text, entities, onEntity }: InlineProps) {
  const parts = text.split(TOKEN).filter((part) => part !== "");
  return (
    <>
      {parts.map((part, index) => {
        if (part.length > 2 && part.startsWith("`") && part.endsWith("`"))
          return <code key={index}>{part.slice(1, -1)}</code>;
        if (part.length > 4 && part.startsWith("**") && part.endsWith("**"))
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        const chip = ENTITY.exec(part);
        if (chip) {
          const entity = entities?.find((entry) => entry.id === chip[1]);
          if (!entity)
            return <React.Fragment key={index}>{part}</React.Fragment>;
          if (!onEntity)
            return (
              <span className="ru-inline-entity" key={index}>
                {entity.title}
              </span>
            );
          return (
            <button
              type="button"
              className="ru-inline-entity"
              key={index}
              onClick={() => onEntity(entity.id)}
              aria-label={`Open: ${entity.title}`}
            >
              {entity.title}
              <ArrowUpRight size={11} aria-hidden="true" />
            </button>
          );
        }
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
