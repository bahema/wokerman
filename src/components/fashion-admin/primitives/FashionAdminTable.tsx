import type { ReactNode } from "react";
import { cx } from "./utils";

type TableColumn = {
  key: string;
  label: string;
  className?: string;
};

type TableRow = {
  key: string;
  cells: Array<ReactNode>;
  className?: string;
};

type FashionAdminTableProps = {
  columns: Array<TableColumn>;
  rows: Array<TableRow>;
  className?: string;
  emptyText?: string;
};

const FashionAdminTable = ({ columns, rows, className, emptyText = "No records yet." }: FashionAdminTableProps) => (
  <div className={cx("overflow-x-auto", className)}>
    <table className="fa-table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} className={column.className}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="text-sm text-[var(--fa-text-secondary)]">
              {emptyText}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.key} className={row.className}>
              {row.cells.map((cell, index) => (
                <td key={`${row.key}-${columns[index]?.key ?? index}`}>{cell}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export default FashionAdminTable;

