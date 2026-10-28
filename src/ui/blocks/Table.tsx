import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import type { Scalar, TableColumn, TableNode, Tone } from "../../core/schema";
import { evaluate } from "../../core/evaluator";
import { formatNumber } from "./Metrics";

type CellTone = Exclude<Tone, "default">;
type Cell = { value: Scalar; text: string; tone?: CellTone };

function percentOf(column: TableColumn, value: Scalar): number {
  const max = column.max ?? 100;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round((Math.min(max, Math.max(0, numeric)) / max) * 100);
}

function display(column: TableColumn, value: Scalar): Cell {
  if (value === null || value === "")
    return { value, text: "—", tone: column.tones?.[""] };
  if (column.format === "progress")
    return { value, text: `${percentOf(column, value)}%` };
  const text =
    typeof value === "number" && column.format !== "status"
      ? formatNumber(value)
      : String(value);
  return { value, text, tone: column.tones?.[String(value)] };
}

function compare(left: Scalar, right: Scalar): number {
  const emptyLeft = left === null || left === "";
  const emptyRight = right === null || right === "";
  if (emptyLeft && emptyRight) return 0;
  if (emptyLeft) return 1;
  if (emptyRight) return -1;
  if (typeof left === "number" && typeof right === "number")
    return left - right;
  if (typeof left === "boolean" || typeof right === "boolean")
    return Number(left) - Number(right);
  return String(left).localeCompare(String(right), "ru", { numeric: true });
}

export function SortableTable({
  node,
  state,
}: {
  node: TableNode;
  state: Record<string, Scalar>;
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [query, setQuery] = useState("");
  const rows = useMemo<Cell[][]>(
    () =>
      node.rows.map((row) =>
        node.columns.map((column) => {
          const expr = row[column.key];
          if (expr === undefined) return { value: null, text: "—" };
          try {
            return display(column, evaluate(expr, state));
          } catch {
            return { value: null, text: "—" };
          }
        }),
      ),
    [node, state],
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ru");
    const filtered = needle
      ? rows.filter((row) =>
          row.some((cell) =>
            cell.text.toLocaleLowerCase("ru").includes(needle),
          ),
        )
      : rows;
    if (!sort) return filtered;
    const index = node.columns.findIndex((column) => column.key === sort.key);
    if (index < 0) return filtered;
    return [...filtered].sort(
      (left, right) =>
        compare(left[index]!.value, right[index]!.value) * sort.dir,
    );
  }, [rows, sort, query, node.columns]);
  const numeric = node.columns.map((column, index) =>
    column.format === "number"
      ? true
      : rows.every(
          (row) =>
            row[index] === undefined ||
            row[index]!.value === null ||
            typeof row[index]!.value === "number",
        ),
  );
  if (rows.length === 0)
    return <p className="ru-empty">{node.empty ?? "Нет данных"}</p>;
  const table = (
    <div className="ru-table-wrap">
      <table>
        {node.caption && <caption>{node.caption}</caption>}
        <thead>
          <tr>
            {node.columns.map((column, index) => {
              const active = sort?.key === column.key;
              const align =
                column.align ??
                (column.format === "status" || column.format === "progress"
                  ? "left"
                  : numeric[index]
                    ? "right"
                    : "left");
              return (
                <th
                  key={column.key}
                  scope="col"
                  data-align={align}
                  data-format={column.format ?? "text"}
                  aria-sort={
                    active
                      ? sort.dir === 1
                        ? "ascending"
                        : "descending"
                      : node.sortable
                        ? "none"
                        : undefined
                  }
                >
                  {node.sortable ? (
                    <button
                      type="button"
                      className="ru-th-button"
                      onClick={() =>
                        setSort((current) =>
                          current?.key === column.key
                            ? {
                                key: column.key,
                                dir: current.dir === 1 ? -1 : 1,
                              }
                            : { key: column.key, dir: 1 },
                        )
                      }
                    >
                      {column.label}
                      {active ? (
                        sort.dir === 1 ? (
                          <ArrowUp size={13} aria-hidden="true" />
                        ) : (
                          <ArrowDown size={13} aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown size={13} aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {visible.map((row, index) => (
            <tr key={index}>
              {node.columns.map((column, cell) => {
                const value = row[cell]!;
                const align =
                  column.align ??
                  (column.format === "status" || column.format === "progress"
                    ? "left"
                    : numeric[cell]
                      ? "right"
                      : "left");
                return (
                  <td
                    key={column.key}
                    data-align={align}
                    data-format={column.format ?? "text"}
                  >
                    {column.format === "status" ? (
                      <span
                        className="ru-status-pill"
                        data-tone={value.tone ?? "muted"}
                      >
                        <i aria-hidden="true" />
                        {value.text}
                      </span>
                    ) : column.format === "progress" ? (
                      <span
                        className="ru-table-progress"
                        data-tone={column.tone ?? "accent"}
                      >
                        <span
                          className="ru-table-bar"
                          role="progressbar"
                          aria-label={column.label}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={percentOf(column, value.value)}
                        >
                          <i
                            style={{
                              width: `${percentOf(column, value.value)}%`,
                            }}
                          />
                        </span>
                        <output>{value.text}</output>
                      </span>
                    ) : (
                      value.text
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          {visible.length === 0 && (
            <tr>
              <td
                colSpan={node.columns.length}
                className="ru-table-none"
                role="status"
              >
                Ничего не найдено
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
  if (!node.filterable) return table;
  return (
    <div className="ru-table-block">
      <div className="ru-table-toolbar">
        <label className="ru-table-filter">
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            value={query}
            aria-label="Фильтр по таблице"
            placeholder={node.filterPlaceholder ?? "Фильтр…"}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {query.trim() !== "" && (
          <span className="ru-table-count" role="status">
            {visible.length} из {rows.length}
          </span>
        )}
      </div>
      {table}
    </div>
  );
}
