export type Member = {
  id: string;
  name: string;
  username: string;
  password: string;
  color: string;
  canManage: boolean;
};

export type Task = {
  id: string;
  title: string;
  assigneeId: string;
  date: string;
  time?: string;
  repeatType?: "none" | "daily" | "weekly" | "monthly";
  repeatEvery?: number;
  repeatLabel: string;
  done: boolean;
  completedAt?: string | null;
};

export type ShoppingItem = {
  id: string;
  title: string;
  assigneeId: string;
  done: boolean;
};

export type AppData = {
  members: Member[];
  tasks: Task[];
  shoppingItems: ShoppingItem[];
};
