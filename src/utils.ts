export function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function buildItemContent(
  text: string,
  addedBy: string,
  addedAt: string,
  checked: boolean,
  checkedBy?: string,
  checkedAt?: string,
): string {
  const statusLine = checked ? `✅ ~~${text}~~` : `☐ **${text}**`;
  let content = `${statusLine}\n> Added by **${addedBy}** • ${addedAt}`;
  if (checked && checkedBy && checkedAt) {
    content += `\n> Done by **${checkedBy}** • ${checkedAt}`;
  }
  return content;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
