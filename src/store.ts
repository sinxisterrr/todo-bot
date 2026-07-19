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

export interface PostTodoItem {
  itemId: string;
  itemText: string;
  addedByName: string;
  addedAt: string;
  checked: boolean;
  checkedByName?: string;
  checkedAt?: string;
}

export interface PostTodoList {
  messageId: string;
  threadId: string;
  guildId: string;
  items: PostTodoItem[];
}

interface StoreData {
  todoThreads: Record<string, string>;       // `${guildId}:${channelId}` -> threadId
  items: Record<string, TodoItem>;           // itemId -> item
  postTodoLists: Record<string, PostTodoList>; // `${guildId}:${threadId}` -> list
}

const storePath = path.join(__dirname, '../data/store.json');

function load(): StoreData {
  if (!fs.existsSync(storePath)) return { todoThreads: {}, items: {}, postTodoLists: {} };
  try {
    const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    if (!data.postTodoLists) data.postTodoLists = {};
    return data;
  } catch {
    return { todoThreads: {}, items: {}, postTodoLists: {} };
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

  getPostTodoList(guildId: string, threadId: string): PostTodoList | undefined {
    return load().postTodoLists[`${guildId}:${threadId}`];
  },

  setPostTodoList(list: PostTodoList): void {
    const data = load();
    data.postTodoLists[`${list.guildId}:${list.threadId}`] = list;
    save(data);
  },
};
