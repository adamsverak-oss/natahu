export type Member = {
  id: string;
  name: string;
  username: string;
  password: string;
  color: string;
  avatar?: string;
  canManage: boolean;
};

export type Task = {
  id: string;
  title: string;
  notes?: string;
  assigneeId: string;
  date: string;
  time?: string;
  priority?: "low" | "medium" | "high";
  repeatType?: "none" | "daily" | "weekly" | "monthly";
  repeatEvery?: number;
  repeatLabel: string;
  done: boolean;
  completedAt?: string | null;
};

export type ShoppingItem = {
  id: string;
  title: string;
  notes?: string;
  assigneeId: string;
  done: boolean;
  repeatType?: "none" | "daily" | "weekly" | "monthly";
  repeatEvery?: number;
};

export type TaskHistoryItem = {
  id: string;
  title: string;
  notes?: string;
  assigneeId: string;
  completedAt: string;
  priority?: "low" | "medium" | "high";
};

export type HouseholdNote = {
  id: string;
  body: string;
  authorId: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  body: string;
  authorId: string;
  createdAt: string;
};

export type PhotoPost = {
  id: string;
  imageUrl: string;
  caption?: string;
  authorId: string;
  createdAt: string;
};

export type AppData = {
  members: Member[];
  tasks: Task[];
  shoppingItems: ShoppingItem[];
  taskHistory: TaskHistoryItem[];
  householdNotes: HouseholdNote[];
  chatMessages: ChatMessage[];
  photoPosts: PhotoPost[];
};
