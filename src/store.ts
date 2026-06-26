import fs from 'fs';
import path from 'path';

export interface TodoItem {
  itemId: string;
  messageId?: string;
  guildId: string;
  channelId: string;
  todoThreadId: string;
  discussionThreadId?: string;
  itemText: string;
  addedById: string;
  addedByName: string;
  addedAt: string;
  checked: boolean;
  checkedById?: string;
  checkedByName?: string;
  checkedAt?: string;
}

interface StoreData {
  todoThreads: Record<string, string>; // `${guildId}:${channelId}` -> threadId
  items: Record<string, TodoItem>;     // itemId -> item
}

const storePath = path.join(__dirname, '../data/store.json');

function load(): StoreData {
  if (!fs.existsSync(storePath)) return { todoThreads: {}, items: {} };
  try {
    return JSON.parse(fs.readFileSync(storePath, 'utf8'));
  } catch {
    return { todoThreads: {}, items: {} };
  }
}

function save(data: StoreData): void {
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
}

export const store = {
  getTodoThread(guildId: string, channelId: string): string | undefined {
    return load().todoThreads[`${guildId}:${channelId}`];
  },

  setTodoThread(guildId: string, channelId: string, threadId: string): void {
    const data = load();
    data.todoThreads[`${guildId}:${channelId}`] = threadId;
    save(data);
  },

  getItem(itemId: string): TodoItem | undefined {
    return load().items[itemId];
  },

  saveItem(item: TodoItem): void {
    const data = load();
    data.items[item.itemId] = item;
    save(data);
  },

  updateItem(itemId: string, updates: Partial<TodoItem>): void {
    const data = load();
    if (data.items[itemId]) {
      data.items[itemId] = { ...data.items[itemId], ...updates };
      save(data);
    }
  },
};
