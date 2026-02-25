/* WHAT IT DO? Renders accessible status chips for fulfillment and vote-alignment states in V3 views. */

import type { ReactElement } from "react";

type StatusVariant = "fulfilled" | "broken" | "in_progress" | "unknown" | "aligned" | "contradicted" | "mixed";

const STATUS_LABELS: Record<StatusVariant, string> = {
  fulfilled: "Fulfilled",
  broken: "Broken",
  in_progress: "In progress",
  unknown: "Unknown",
  aligned: "Aligned",
  contradicted: "Contradicted",
  mixed: "Mixed"
};

export const StatusChip = ({
  status,
  prefix
}: {
  status: StatusVariant;
  prefix?: string;
}): ReactElement => {
  const label = STATUS_LABELS[status] ?? STATUS_LABELS.unknown;
  const ariaPrefix = prefix ? `${prefix}: ` : "";

  return (
    <span className="status-chip" data-status={status} aria-label={`${ariaPrefix}${label}`}>
      {label}
    </span>
  );
};
