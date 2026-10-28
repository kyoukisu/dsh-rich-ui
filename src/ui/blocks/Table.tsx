import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { Scalar, TableNode } from "../../core/schema";
import { evaluate } from "../../core/evaluator";
import { formatNumber } from "./Metrics";

type Row = { cells: Scalar[]; missing: boolean };

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
  const rows = useMemo<Row[]>(
    () =>
      node.rows.map((row) => ({
        missing: false,
        cells: node.columns.map((column) => {
          const expr = row[column.key];
          if (expr === undefined) return null;
          try {
            return evaluate(expr, state);
          } catch {
            return null;
          }
        }),
      })),
    [node, state],
  );
  const ordered = useMemo(() => {
    if (!sort) return rows;
    const index = node.columns.findIndex((column) => column.key === sort.key);
    if (index < 0) return rows;
    return [...rows].sort(
      (left, right) =>
        compare(left.cells[index]!, right.cells[index]!) * sort.dir,
    );
  }, [rows, sort, node.columns]);
  const numeric = node.columns.map((_, index) =>
    rows.every(
      (row) =>
        row.cells[index] === null || typeof row.cells[index] === "number",
    ),
  );
  if (rows.length === 0)
    return <p className="ru-empty">{node.empty ?? "Нет данных"}</p>;
  return (
    <div className="ru-table-wrap">
      <table>
        {node.caption && <caption>{node.caption}</caption>}
        <thead>
          <tr>
            {node.columns.map((column, index) => {
              const active = sort?.key === column.key;
              const align = column.align ?? (numeric[index] ? "right" : "left");
              return (
                <th
                  key={column.key}
                  scope="col"
                  data-align={align}
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
          {ordered.map((row, index) => (
            <tr key={index}>
              {node.columns.map((column, cell) => (
                <td
                  key={column.key}
                  data-align={
                    column.align ?? (numeric[cell] ? "right" : "left")
                  }
                >
                  {row.cells[cell] === null
                    ? "—"
                    : typeof row.cells[cell] === "number"
                      ? formatNumber(row.cells[cell] as number)
                      : String(row.cells[cell])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
