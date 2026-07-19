import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import type { PostTodoItem } from './store';

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

export function buildPostTodoContent(items: PostTodoItem[]): string {
  const lines = ['## 📋 To-Do'];
  for (const item of items) {
    if (item.checked) {
      let line = `✅ ~~${item.itemText}~~  •  *${item.addedByName} • ${item.addedAt}`;
      if (item.checkedByName && item.checkedAt) {
        line += ` | done by ${item.checkedByName} • ${item.checkedAt}`;
      }
      line += '*';
      lines.push(line);
    } else {
      lines.push(`☐ **${item.itemText}**  •  *${item.addedByName} • ${item.addedAt}*`);
    }
  }
  return lines.join('\n');
}

export function parsePostTodoContent(content: string): PostTodoItem[] {
  const items: PostTodoItem[] = [];
  for (const line of content.split('\n')) {
    const unchecked = line.match(/^☐ \*\*(.+?)\*\*  •  \*(.+?) • (.+?)\*$/);
    if (unchecked) {
      items.push({
        itemId: generateId(),
        itemText: unchecked[1],
        addedByName: unchecked[2],
        addedAt: unchecked[3],
        checked: false,
      });
      continue;
    }
    const checked = line.match(/^✅ ~~(.+?)~~  •  \*(.+?) • (.+?)(?:\s+\|\s+done by (.+?) • (.+?))?\*$/);
    if (checked) {
      items.push({
        itemId: generateId(),
        itemText: checked[1],
        addedByName: checked[2],
        addedAt: checked[3],
        checked: true,
        checkedByName: checked[4] ?? undefined,
        checkedAt: checked[5] ?? undefined,
      });
    }
  }
  return items;
}

export function buildPostTodoSelectRow(items: PostTodoItem[], threadId: string) {
  const options = items.slice(0, 25).map((item, i) => {
    const prefix = item.checked ? '✅ ' : '☐ ';
    const label = (prefix + item.itemText).slice(0, 100);
    return new StringSelectMenuOptionBuilder().setLabel(label).setValue(String(i));
  });
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`post_todo_toggle:${threadId}`)
    .setPlaceholder('Toggle an item...')
    .addOptions(options);
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}
