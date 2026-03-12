import { getSql } from "@/lib/db";
import type {
  AppData,
  ChatMessage,
  HouseholdNote,
  ShoppingItem,
  Task,
  TaskHistoryItem,
} from "@/lib/app-data";

type DbTask = {
  id: string;
  title: string;
  notes: string | null;
  assigneeId: string;
  date: string;
  time: string | null;
  priority: "low" | "medium" | "high";
  repeatType: "none" | "daily" | "weekly" | "monthly";
  repeatEvery: number;
  repeatLabel: string;
  done: boolean;
  completedAt: string | null;
};

type DbShoppingItem = {
  id: string;
  title: string;
  notes: string | null;
  assigneeId: string;
  done: boolean;
  repeatType: "none" | "daily" | "weekly" | "monthly";
  repeatEvery: number;
};

type DbHistoryItem = {
  id: string;
  title: string;
  notes: string | null;
  assigneeId: string;
  completedAt: string;
  priority: "low" | "medium" | "high";
};

type DbHouseholdNote = {
  id: string;
  body: string;
  authorId: string;
  createdAt: string;
};

type DbChatMessage = {
  id: string;
  body: string;
  authorId: string;
  createdAt: string;
};

function currentMonthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function mapTask(task: DbTask): Task {
  return {
    ...task,
    notes: task.notes ?? undefined,
    time: task.time ?? undefined,
    priority: task.priority,
    repeatType: task.repeatType,
    repeatEvery: task.repeatEvery,
    completedAt: task.completedAt,
  };
}

function mapShoppingItem(item: DbShoppingItem): ShoppingItem {
  return {
    ...item,
    notes: item.notes ?? undefined,
    repeatType: item.repeatType,
    repeatEvery: item.repeatEvery,
  };
}

function mapHistoryItem(item: DbHistoryItem): TaskHistoryItem {
  return {
    ...item,
    notes: item.notes ?? undefined,
    priority: item.priority,
  };
}

function mapHouseholdNote(item: DbHouseholdNote): HouseholdNote {
  return item;
}

function mapChatMessage(item: DbChatMessage): ChatMessage {
  return item;
}

export async function cleanupOldCompletedTasks() {
  const sql = getSql();
  await sql`
    delete from tasks
    where done = true
      and completed_at is not null
      and completed_at < ${currentMonthStartIso()}
  `;
  await sql`
    delete from chat_messages
    where created_at < now() - interval '72 hours'
  `;
}

export async function readAppData(): Promise<AppData> {
  const sql = getSql();
  await cleanupOldCompletedTasks();

  const members = await sql<AppData["members"][number][]>`
    select
      id,
      name,
      username,
      '' as password,
      color,
      avatar,
      can_manage as "canManage"
    from users
    order by created_at asc
  `;

  const tasks = await sql<DbTask[]>`
    select
      id,
      title,
      notes,
      assignee_id as "assigneeId",
      task_date::text as date,
      task_time::text as time,
      priority,
      repeat_type as "repeatType",
      repeat_every as "repeatEvery",
      repeat_label as "repeatLabel",
      done,
      completed_at::text as "completedAt"
    from tasks
    order by task_date asc, coalesce(task_time::text, '99:99') asc, created_at desc
  `;

  const shoppingItems = await sql<DbShoppingItem[]>`
    select
      id,
      title,
      notes,
      assignee_id as "assigneeId",
      done,
      repeat_type as "repeatType",
      repeat_every as "repeatEvery"
    from shopping_items
    order by done asc, created_at desc
  `;

  const taskHistory = await sql<DbHistoryItem[]>`
    select
      id,
      title,
      notes,
      assignee_id as "assigneeId",
      completed_at::text as "completedAt",
      priority
    from task_history
    order by completed_at desc
    limit 200
  `;

  const householdNotes = await sql<DbHouseholdNote[]>`
    select
      id,
      body,
      author_id as "authorId",
      created_at::text as "createdAt"
    from household_notes
    order by created_at desc
    limit 50
  `;

  const chatMessages = await sql<DbChatMessage[]>`
    select
      id,
      body,
      author_id as "authorId",
      created_at::text as "createdAt"
    from chat_messages
    order by created_at desc
    limit 100
  `;

  return {
    members,
    tasks: tasks.map(mapTask),
    shoppingItems: shoppingItems.map(mapShoppingItem),
    taskHistory: taskHistory.map(mapHistoryItem),
    householdNotes: householdNotes.map(mapHouseholdNote),
    chatMessages: chatMessages.map(mapChatMessage),
  };
}
