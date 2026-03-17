/* Shared date, number, and label formatters used across PNYX V3 pages. */

export const DATA_NOT_AVAILABLE = "Data not yet available";

export const formatDate = (isoDate: string | null | undefined): string => {
  if (!isoDate) {
    return DATA_NOT_AVAILABLE;
  }

  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return DATA_NOT_AVAILABLE;
  }

  return new Intl.DateTimeFormat("fi-FI", {
    dateStyle: "medium"
  }).format(parsed);
};

export const formatDateTime = (isoDate: string | null | undefined): string => {
  if (!isoDate) {
    return DATA_NOT_AVAILABLE;
  }

  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return DATA_NOT_AVAILABLE;
  }

  return new Intl.DateTimeFormat("fi-FI", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsed);
};

export const formatPercent = (value: number): string => {
  return `${Math.round(value * 100)}%`;
};

export const normalizeForSearch = (value: string | null | undefined): string => {
  return (value ?? "").trim().toLowerCase();
};

export const formatIdentityLine = (office: string | null, region: string | null): string => {
  const officeLabel = office?.trim() ? office.trim() : "Office not provided";
  const regionLabel = region?.trim() ? region.trim() : "Region not provided";
  return `${officeLabel} · ${regionLabel}`;
};
