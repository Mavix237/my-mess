export const PLACEHOLDERS = {
  category: "Untitled category",
  task: "What needs doing?",
  notes: "Notes, links, ideas…",
} as const;

export function displayLabel(label: string, fallback: string) {
  const trimmed = label.trim();
  return trimmed || fallback;
}
