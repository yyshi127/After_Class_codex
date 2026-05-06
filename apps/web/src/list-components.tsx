"use client";

import { ReactNode } from "react";

export type DataColumn<T> = {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
};

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-serenity-surface p-4 shadow-neumorphic">{children}</div>;
}

export function DataTable<T>({ rows, columns, emptyText }: { rows: T[]; columns: Array<DataColumn<T>>; emptyText: string }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-serenity-bg shadow-insetSoft">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="text-serenity-muted">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={`px-4 py-3 font-medium ${column.className ?? ""}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-white/70">
              {columns.map((column) => (
                <td key={column.key} className={`px-4 py-3 ${column.className ?? ""}`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length ? <div className="p-8 text-center text-sm text-serenity-muted">{emptyText}</div> : null}
    </div>
  );
}

export function PaginationControl({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2 text-sm text-serenity-muted">
      <button
        className="rounded-2xl bg-serenity-bg px-4 py-2 shadow-insetSoft disabled:opacity-50"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        上一页
      </button>
      <span>
        {page} / {Math.max(pageCount, 1)}
      </span>
      <button
        className="rounded-2xl bg-serenity-bg px-4 py-2 shadow-insetSoft disabled:opacity-50"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        下一页
      </button>
    </div>
  );
}
