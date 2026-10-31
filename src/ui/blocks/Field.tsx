import React, { useEffect, useId, useRef, useState } from "react";
import { LIMITS, type InputNode, type Scalar } from "../../core/schema";

const NUMBER_LIMIT = "1,000,000,000,000";

/**
 * A text, number or date field backed by one state key. Numbers are validated
 * before they reach shared state: the evaluator refuses salaries/limits beyond
 * ±1e12 and strings longer than the document budget, so a field that accepted
 * them would break every neighbouring block instead of itself.
 */
export function InputField({
  node,
  value,
  onCommit,
}: {
  node: InputNode;
  value: Scalar | undefined;
  onCommit: (value: Scalar) => void;
}) {
  const errorId = useId();
  const inputType = node.inputType ?? "text";
  const [draft, setDraft] = useState(() => String(value ?? ""));
  const [error, setError] = useState("");
  const focused = useRef(false);

  // Another control, an action or a reset may change the key while this field
  // is idle. Do not overwrite what the reader is still typing.
  useEffect(() => {
    if (!focused.current) setDraft(String(value ?? ""));
  }, [value]);

  if (inputType !== "number") {
    return (
      <label className="ru-field">
        <span>{node.label}</span>
        <input
          aria-label={node.label ?? node.stateKey}
          type={inputType}
          value={String(value ?? "")}
          placeholder={node.placeholder}
          maxLength={inputType === "text" ? LIMITS.string : undefined}
          onChange={(event) =>
            onCommit(
              inputType === "text"
                ? event.target.value.slice(0, LIMITS.string)
                : event.target.value,
            )
          }
        />
      </label>
    );
  }

  const commit = (raw: string) => {
    // type="number" gives an empty string for partial input such as "-".
    if (raw === "" || raw === "-") {
      setDraft(raw);
      setError("");
      onCommit(0);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || Math.abs(parsed) > 1e12) {
      setDraft(raw);
      setError(`Enter a number between -${NUMBER_LIMIT} and ${NUMBER_LIMIT}.`);
      return;
    }
    setDraft(raw);
    setError("");
    onCommit(parsed);
  };

  return (
    <label className="ru-field">
      <span>{node.label}</span>
      <input
        aria-label={node.label ?? node.stateKey}
        type="number"
        value={draft}
        placeholder={node.placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
        }}
        onChange={(event) => commit(event.target.value)}
      />
      {error && (
        <small id={errorId} className="ru-field-error" role="alert">
          {error}
        </small>
      )}
    </label>
  );
}
