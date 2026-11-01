/** Tidies model output for WhatsApp, which uses *bold* and has no markdown links or headings. */
export function toWhatsAppText(text: string) {
  const tidy = text
    .replace(/\*\*([^*]+)\*\*/g, "*$1*")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, "$1: $2")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();

  // The model sometimes writes its answer twice with small changes. Keep the last version.
  const lines = tidy.split("\n");
  const opening = (line: string) => line.trim().slice(0, 24).toLowerCase();
  return lines
    .filter((line, i) => !line.trim() || !lines.slice(i + 1).some((later) => opening(later) === opening(line)))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
