export const ORDER_DISPATCHED_AT_LABEL = "Fecha enviado a delivery";
export const ORDER_DELIVERED_AT_LABEL = "Fecha entregado";

export function getOrderTrackingNote(
  notes: string | null | undefined,
  label: string,
) {
  const normalizedLabel = label.trim().toLowerCase();

  for (const line of notes?.split(/\r?\n/) ?? []) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) {
      continue;
    }

    const currentLabel = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (currentLabel === normalizedLabel && value) {
      return value;
    }
  }

  return null;
}

export function upsertOrderTrackingNote(
  notes: string | null | undefined,
  label: string,
  value: string,
) {
  const normalizedLabel = label.trim().toLowerCase();
  const lines = notes
    ?.split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean) ?? [];
  const replacement = `${label}: ${value}`;
  const existingIndex = lines.findIndex((line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) {
      return false;
    }

    return line.slice(0, separatorIndex).trim().toLowerCase() === normalizedLabel;
  });

  if (existingIndex >= 0) {
    lines[existingIndex] = replacement;
  } else {
    lines.push(replacement);
  }

  return lines.join("\n");
}
