type StatusChipProps = {
  status: "Draft" | "Published";
};

const StatusChip = ({ status }: StatusChipProps) => (
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
      status === "Draft"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
    }`}
  >
    {status}
  </span>
);

export default StatusChip;
