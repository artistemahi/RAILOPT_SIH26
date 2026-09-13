import type { ReactNode } from "react";

export interface ColumnDef<T> {
  header: string;
  accessor?: keyof T | ((row: T) => ReactNode);
  className?: string;
  headerClassName?: string;
  width?: string | number;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyField: keyof T;
  selectedId?: string | number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  maxHeight?: string | number;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  selectedId,
  onRowClick,
  emptyMessage = "No records found matching criteria.",
  maxHeight,
  className = "",
}: DataTableProps<T>) {
  return (
    <div
      className={`rail-table-container ${className}`}
      style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}
    >
      <table className="rail-data-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={col.headerClassName || ""}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="empty-cell">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => {
              const rowId = row[keyField];
              const isSelected = selectedId !== undefined && rowId === selectedId;

              return (
                <tr
                  key={String(rowId)}
                  className={`rail-table-row ${isSelected ? "selected-row" : ""} ${
                    onRowClick ? "clickable" : ""
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col, cIdx) => {
                    let cellContent: ReactNode = null;
                    if (typeof col.accessor === "function") {
                      cellContent = col.accessor(row);
                    } else if (col.accessor) {
                      cellContent = row[col.accessor];
                    }
                    return (
                      <td
                        key={cIdx}
                        className={col.className || ""}
                      >
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
