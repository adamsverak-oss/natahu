import { getSql } from "@/lib/db";
import type { AppData, ShoppingItem, Task } from "@/lib/app-data";

type DbTask = {
  id: string;
  title: string;
  assigneeId: string;
  date: string;
  time: string | null;
  repeatType: "none" | "daily" | "weekly" | "monthly";
  repeatEvery: number;
  repeatLabel: string;
  done: boolean;
  completedAt: string | null;
};

type DbShoppingItem = {
  id: string;
  title: string;
  assigneeId: string;
  done: boolean;
};

function currentMonthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function mapTask(task: DbTask): Task {
  return {
    ...task,
    time: task.time ?? undefined,
    repeatType: task.repeatType,
    repeatEvery: task.repeatEvery,
    completedAt: task.completedAt,
  };
}

function mapShoppingItem(item: DbShoppingItem): ShoppingItem {
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
      can_manage as "canManage"
    from users
    order by created_at asc
  `;

  const tasks = await sql<DbTask[]>`
    select
      id,
      title,
      assignee_id as "assigneeId",
      task_date::text as date,
      task_time::text as time,
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
      assignee_id as "assigneeId",
      done
    from shopping_items
    order by done asc, created_at desc
  `;

  return {
    members,
    tasks: tasks.map(mapTask),
    shoppingItems: shoppingItems.map(mapShoppingItem),
  };
}
