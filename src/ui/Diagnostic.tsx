import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, Wrench } from "lucide-react";

export interface DiagnosticProps {
  /** Validator message; plain text, never HTML. */
  error: string;
  /** Rejected fence source, shown behind a disclosure and sent back on repair. */
  source: string;
  /** Sends the error and source back to the owning session; absent without one. */
  onRepair?: () => void;
}

const SHOWN = 20_000;

/** Plain-language summary; the exact validator text stays visible below. */
export function explain(error: string): string {
  const missing = /^Missing ([A-Za-z0-9_]+)$/.exec(error);
  if (missing) return `Не хватает обязательного поля «${missing[1]}».`;
  const unknown = /^Unknown field: (.+)$/.exec(error);
  if (unknown) return `Неизвестное поле «${unknown[1]}».`;
  const entity = /^Unknown entity: (.+)$/.exec(error);
  if (entity) return `Ссылка на несуществующую сущность «${entity[1]}».`;
  if (/^Unknown node type/.test(error)) return "Неизвестный тип блока.";
  if (/^Unsupported spec version/.test(error))
    return "Неподдерживаемая версия документа.";
  if (/^Duplicate /.test(error)) return "Повторяющийся идентификатор.";
  if (/URL|protocol/.test(error)) return "Недопустимая ссылка.";
  if (/budget|too long|too many|exceeded/i.test(error))
    return "Документ превысил допустимый размер.";
  if (/^Expected /.test(error)) return "Неверный тип значения.";
  if (/^Invalid enum value/.test(error))
    return "Недопустимое значение перечисления.";
  if (/^Number out of bounds/.test(error))
    return "Число вне допустимого диапазона.";
  return "Документ не соответствует схеме.";
}

/**
 * A claimed rich-ui fence that the strict parser rejected. The code block stays
 * hidden because this card carries the same source plus the actionable reason;
 * nothing is repaired or executed silently.
 */
export function Diagnostic({ error, source, onRepair }: DiagnosticProps) {
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const [sent, setSent] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `rich-ui error: ${error}\n\n${source}`,
      );
      setCopied("done");
    } catch {
      setCopied("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied("idle"), 2200);
  };
  const visible =
    source.length > SHOWN ? `${source.slice(0, SHOWN)}\n…обрезано` : source;
  return (
    <section className="rich-ui ru-diagnostic" aria-label="Ошибка rich-ui">
      <header className="ru-diagnostic-head">
        <AlertTriangle size={18} aria-hidden="true" />
        <div>
          <strong>Rich-блок не разобран</strong>
          <span>Документ не прошёл схему. Исходник сохранён ниже.</span>
        </div>
      </header>
      <p className="ru-diagnostic-summary">{explain(error)}</p>
      <p className="ru-diagnostic-error">
        <span>Схема:</span> {error}
      </p>
      <div className="ru-diagnostic-actions">
        <button type="button" className="ru-button" onClick={() => void copy()}>
          {copied === "done" ? <Check size={14} /> : <Copy size={14} />}
          <span aria-live="polite">
            {copied === "done"
              ? "Скопировано"
              : copied === "failed"
                ? "Не удалось"
                : "Скопировать ошибку"}
          </span>
        </button>
        {onRepair && (
          <button
            type="button"
            className="ru-button ru-button-primary"
            disabled={sent}
            onClick={() => {
              if (sent) return;
              onRepair();
              setSent(true);
            }}
          >
            <Wrench size={14} />
            {sent ? "Запрос отправлен" : "Попросить модель исправить"}
          </button>
        )}
      </div>
      <details>
        <summary>Показать исходный JSON</summary>
        <pre>{visible}</pre>
      </details>
      <p className="ru-diagnostic-note">
        Исправление отправит ошибку и исходник в текущую сессию — это запрос к
        модели. Блок не исполнялся и не изменялся.
      </p>
    </section>
  );
}
