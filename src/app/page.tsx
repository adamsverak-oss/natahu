"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import type {
  AppData,
  ChatMessage,
  HouseholdNote,
  ShoppingItem,
  Task,
  TaskHistoryItem,
} from "@/lib/app-data";
import type { SessionUser } from "@/lib/types";
import { getRepeatLabel } from "@/lib/repeat";

type SectionId =
  | "dashboard"
  | "calendar"
  | "family"
  | "shopping"
  | "mine"
  | "reminders"
  | "notes"
  | "chat"
  | "admin";

type BootstrapPayload = {
  user: SessionUser;
  data: AppData;
};

const chatSeenStorageKey = "natahu-chat-last-seen";

type RepeatType = "none" | "daily" | "weekly" | "monthly";
type Priority = "low" | "medium" | "high";

const emptyData: AppData = {
  members: [],
  tasks: [],
  shoppingItems: [],
  taskHistory: [],
  householdNotes: [],
  chatMessages: [],
};

const priorityLabels: Record<Priority, string> = {
  low: "Nizka",
  medium: "Stredni",
  high: "Vysoka",
};

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("cs-CZ", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateLabel(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}. ${month}. ${year}`;
}

function formatTimeLabel(time?: string) {
  return time || "Bez casu";
}

function formatDateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getBadgeText(text?: string) {
  return (text || "NA").slice(0, 2).toUpperCase();
}

function getTaskSortKey(task: Task) {
  return `${task.date}-${task.time ?? "99:99"}-${task.title}`;
}

function getMonthlyPoints(memberId: string, history: TaskHistoryItem[]) {
  const monthKey = getCurrentMonthKey();
  return history.filter((item) => item.assigneeId === memberId && item.completedAt.startsWith(monthKey)).length;
}

function getPriorityClass(priority?: Priority) {
  if (priority === "high") return styles.priorityHigh;
  if (priority === "low") return styles.priorityLow;
  return styles.priorityMedium;
}

export default function HomePage() {
  const [data, setData] = useState<AppData>(emptyData);
  const [activeUser, setActiveUser] = useState<SessionUser | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("dashboard");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bootstrapError, setBootstrapError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [lastSeenChatAt, setLastSeenChatAt] = useState("");

  const [taskForm, setTaskForm] = useState({
    title: "",
    notes: "",
    assigneeId: "",
    date: getTodayKey(),
    time: "18:00",
    priority: "medium" as Priority,
    repeatType: "none" as RepeatType,
    repeatEvery: "1",
  });
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [shoppingForm, setShoppingForm] = useState({
    title: "",
    notes: "",
    assigneeId: "",
    repeatType: "none" as RepeatType,
    repeatEvery: "1",
  });
  const [editingShoppingId, setEditingShoppingId] = useState<string | null>(null);

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(getTodayKey());
  const [calendarFilterUserId, setCalendarFilterUserId] = useState("all");
  const [calendarFilterStatus, setCalendarFilterStatus] = useState("all");
  const [calendarFilterPriority, setCalendarFilterPriority] = useState("all");

  const [adminUserId, setAdminUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [memberColor, setMemberColor] = useState("#ff7a18");
  const [memberAvatar, setMemberAvatar] = useState("AD");

  const [noteBody, setNoteBody] = useState("");
  const [chatBody, setChatBody] = useState("");

  const canManage = activeUser?.canManage ?? false;
  const canOpenAdmin = activeUser?.id === "adam";
  const todayKey = getTodayKey();

  const sections = [
    { id: "dashboard" as const, label: "Prehled", hint: "Dnes a rychle akce" },
    { id: "calendar" as const, label: "Kalendar", hint: "Filtry a terminy" },
    { id: "family" as const, label: "Rodina", hint: "Body a zebricek" },
    { id: "shopping" as const, label: "Nakupy", hint: "Seznam a opakovani" },
    { id: "mine" as const, label: "Moje ukoly", hint: "Jen moje veci" },
    { id: "reminders" as const, label: "Pripominky", hint: "Co hori a co se blizi" },
    { id: "notes" as const, label: "Domov", hint: "Poznamky pro domacnost" },
    { id: "chat" as const, label: "Chat", hint: "Rodinna komunikace" },
    ...(canOpenAdmin ? [{ id: "admin" as const, label: "Admin", hint: "Hesla a profily" }] : []),
  ];

  async function loadBootstrap(showLoading = false) {
    if (showLoading) setLoading(true);

    try {
      const response = await fetch("/api/bootstrap", {
        cache: "no-store",
        credentials: "include",
      });

      if (response.status === 401) {
        setActiveUser(null);
        setData(emptyData);
        setBootstrapError("");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { hint?: string } | null;
        setBootstrapError(payload?.hint || "Nepodarilo se nacist aplikaci.");
        setLoading(false);
        return;
      }

      const payload = (await response.json()) as BootstrapPayload;
      setActiveUser(payload.user);
      setData(payload.data);
      setTaskForm((current) => ({
        ...current,
        assigneeId: current.assigneeId || payload.data.members[0]?.id || "",
      }));
      setShoppingForm((current) => ({
        ...current,
        assigneeId: current.assigneeId || payload.data.members[0]?.id || "",
      }));
      const defaultMember = payload.data.members.find((member) => member.id === (adminUserId || payload.data.members[0]?.id));
      setAdminUserId((current) => current || payload.data.members[0]?.id || "");
      if (defaultMember) {
        setMemberColor(defaultMember.color);
        setMemberAvatar(defaultMember.avatar || getBadgeText(defaultMember.name));
      }
      setBootstrapError("");
      setLoading(false);
    } catch {
      setBootstrapError("Spojeni s aplikaci selhalo. Zkus obnovit stranku.");
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBootstrap(true);
  }, []);

  useEffect(() => {
    if (!activeUser || typeof window === "undefined") return;
    setNotificationsEnabled("Notification" in window && Notification.permission === "granted");
  }, [activeUser]);

  useEffect(() => {
    if (!activeUser || typeof window === "undefined") return;
    const key = `${chatSeenStorageKey}-${activeUser.id}`;
    setLastSeenChatAt(window.localStorage.getItem(key) || "");
  }, [activeUser]);

  const todayTasks = useMemo(
    () => data.tasks.filter((task) => task.date === todayKey),
    [data.tasks, todayKey]
  );

  const filteredCalendarTasks = useMemo(() => {
    return data.tasks.filter((task) => {
      if (calendarFilterUserId !== "all" && task.assigneeId !== calendarFilterUserId) return false;
      if (calendarFilterStatus === "done" && !task.done) return false;
      if (calendarFilterStatus === "open" && task.done) return false;
      if (calendarFilterPriority !== "all" && task.priority !== calendarFilterPriority) return false;
      return true;
    });
  }, [data.tasks, calendarFilterPriority, calendarFilterStatus, calendarFilterUserId]);

  const upcomingTasks = useMemo(
    () =>
      data.tasks
        .filter((task) => task.date !== todayKey && !task.done)
        .sort((left, right) => getTaskSortKey(left).localeCompare(getTaskSortKey(right))),
    [data.tasks, todayKey]
  );

  const myTasks = useMemo(
    () =>
      data.tasks
        .filter((task) => task.assigneeId === activeUser?.id)
        .sort((left, right) => getTaskSortKey(left).localeCompare(getTaskSortKey(right))),
    [activeUser?.id, data.tasks]
  );

  const selectedDateTasks = useMemo(
    () =>
      filteredCalendarTasks
        .filter((task) => task.date === selectedDate)
        .sort((left, right) => getTaskSortKey(left).localeCompare(getTaskSortKey(right))),
    [filteredCalendarTasks, selectedDate]
  );

  const reminderTasks = useMemo(() => {
    const mine = data.tasks.filter((task) => task.assigneeId === activeUser?.id && !task.done);
    return {
      overdue: mine.filter((task) => task.date < todayKey),
      today: mine.filter((task) => task.date === todayKey),
      upcoming: mine.filter((task) => task.date > todayKey).slice(0, 5),
    };
  }, [activeUser?.id, data.tasks, todayKey]);

  const leaderboard = useMemo(
    () =>
      [...data.members]
        .map((member) => ({
          ...member,
          points: getMonthlyPoints(member.id, data.taskHistory),
        }))
        .sort((left, right) => right.points - left.points),
    [data.members, data.taskHistory]
  );

  const memberOnDuty = todayTasks[0]
    ? data.members.find((member) => member.id === todayTasks[0].assigneeId) ?? null
    : null;

  const unreadChatCount = useMemo(() => {
    if (!activeUser) return 0;
    return data.chatMessages.filter(
      (message) => message.authorId !== activeUser.id && (!lastSeenChatAt || message.createdAt > lastSeenChatAt)
    ).length;
  }, [activeUser, data.chatMessages, lastSeenChatAt]);

  useEffect(() => {
    if (!activeUser || !notificationsEnabled || typeof window === "undefined") return;

    const storageKey = `natahu-notify-${activeUser.id}-${todayKey}`;
    if (window.localStorage.getItem(storageKey)) return;

    const count = reminderTasks.overdue.length + reminderTasks.today.length;
    if (count > 0) {
      new Notification("NaTahu", {
        body:
          reminderTasks.overdue.length > 0
            ? `Mas ${reminderTasks.overdue.length} ukolu po terminu a ${reminderTasks.today.length} na dnesek.`
            : `Mas ${reminderTasks.today.length} ukolu na dnesek.`,
      });
      window.localStorage.setItem(storageKey, "1");
    }
  }, [activeUser, notificationsEnabled, reminderTasks, todayKey]);

  async function runMutation(url: string, body?: object) {
    setSaving(true);
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setSaving(false);

    if (!response.ok) {
      if (response.status === 401) await loadBootstrap();
      throw new Error("Request failed");
    }

    await loadBootstrap();
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();

    const response = await fetch("/api/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      setLoginError("Jmeno nebo heslo nesedi.");
      return;
    }

    setLoginError("");
    setBootstrapError("");
    await loadBootstrap();
  }

  async function handleLogout() {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
    });
    setActiveUser(null);
    setData(emptyData);
    setActiveSection("dashboard");
  }

  async function enableNotifications() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setNotificationsEnabled(result === "granted");
  }

  async function toggleTask(taskId: string) {
    if (!activeUser) return;
    try {
      await runMutation(`/api/tasks/${taskId}/toggle`);
    } catch {}
  }

  async function toggleShoppingItem(itemId: string) {
    if (!activeUser) return;
    try {
      await runMutation(`/api/shopping/${itemId}/toggle`);
    } catch {}
  }

  function beginEditTask(task: Task) {
    setEditingTaskId(task.id);
    setTaskForm({
      title: task.title,
      notes: task.notes || "",
      assigneeId: task.assigneeId,
      date: task.date,
      time: task.time || "18:00",
      priority: task.priority || "medium",
      repeatType: task.repeatType || "none",
      repeatEvery: String(task.repeatEvery || 1),
    });
    setActiveSection("mine");
  }

  function clearTaskForm() {
    setEditingTaskId(null);
    setTaskForm({
      title: "",
      notes: "",
      assigneeId: data.members[0]?.id || "",
      date: getTodayKey(),
      time: "18:00",
      priority: "medium",
      repeatType: "none",
      repeatEvery: "1",
    });
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeUser || !canManage || !taskForm.title.trim() || !taskForm.assigneeId) return;

    const payload = {
      title: taskForm.title.trim(),
      notes: taskForm.notes.trim(),
      assigneeId: taskForm.assigneeId,
      date: taskForm.date,
      time: taskForm.time || null,
      priority: taskForm.priority,
      repeatType: taskForm.repeatType,
      repeatEvery: Number.parseInt(taskForm.repeatEvery, 10) || 1,
    };

    try {
      if (editingTaskId) {
        await runMutation(`/api/tasks/${editingTaskId}/update`, payload);
      } else {
        await runMutation("/api/tasks", payload);
      }
      clearTaskForm();
    } catch {}
  }

  async function deleteTask(taskId: string) {
    if (!canManage) return;
    if (!window.confirm("Opravdu chces tenhle ukol smazat?")) return;
    try {
      await runMutation(`/api/tasks/${taskId}/delete`);
      if (editingTaskId === taskId) clearTaskForm();
    } catch {}
  }

  function beginEditShopping(item: ShoppingItem) {
    setEditingShoppingId(item.id);
    setShoppingForm({
      title: item.title,
      notes: item.notes || "",
      assigneeId: item.assigneeId,
      repeatType: item.repeatType || "none",
      repeatEvery: String(item.repeatEvery || 1),
    });
    setActiveSection("shopping");
  }

  function clearShoppingForm() {
    setEditingShoppingId(null);
    setShoppingForm({
      title: "",
      notes: "",
      assigneeId: data.members[0]?.id || "",
      repeatType: "none",
      repeatEvery: "1",
    });
  }

  async function saveShopping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeUser || !canManage || !shoppingForm.title.trim() || !shoppingForm.assigneeId) return;

    const payload = {
      title: shoppingForm.title.trim(),
      notes: shoppingForm.notes.trim(),
      assigneeId: shoppingForm.assigneeId,
      repeatType: shoppingForm.repeatType,
      repeatEvery: Number.parseInt(shoppingForm.repeatEvery, 10) || 1,
    };

    try {
      if (editingShoppingId) {
        await runMutation(`/api/shopping/${editingShoppingId}/update`, payload);
      } else {
        await runMutation("/api/shopping", payload);
      }
      clearShoppingForm();
    } catch {}
  }

  async function deleteShopping(itemId: string) {
    if (!canManage) return;
    if (!window.confirm("Opravdu chces tuhle polozku smazat?")) return;
    try {
      await runMutation(`/api/shopping/${itemId}/delete`);
      if (editingShoppingId === itemId) clearShoppingForm();
    } catch {}
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !adminUserId || newPassword.trim().length < 6) {
      setAdminMessage("Heslo musi mit alespon 6 znaku.");
      return;
    }

    try {
      await runMutation("/api/admin/password", {
        userId: adminUserId,
        newPassword: newPassword.trim(),
      });
      setNewPassword("");
      setAdminMessage("Heslo bylo zmeneno a stare session byly odhlaseny.");
    } catch {
      setAdminMessage("Zmenu hesla se nepodarilo ulozit.");
    }
  }

  async function saveMemberProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !adminUserId) return;
    try {
      await runMutation("/api/admin/member", {
        userId: adminUserId,
        color: memberColor,
        avatar: memberAvatar,
      });
      setAdminMessage("Profil clena byl upraven.");
    } catch {
      setAdminMessage("Profil se nepodarilo ulozit.");
    }
  }

  async function addHouseholdNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!noteBody.trim()) return;
    try {
      await runMutation("/api/notes", { body: noteBody.trim() });
      setNoteBody("");
    } catch {}
  }

  async function sendChatMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = chatBody.trim();
    if (!trimmed || isSendingChat) return;
    try {
      setIsSendingChat(true);
      setChatBody("");
      await runMutation("/api/chat", { body: trimmed });
      markChatAsRead(new Date().toISOString());
    } catch {
      setChatBody(trimmed);
    } finally {
      setIsSendingChat(false);
    }
  }

  function markChatAsRead(timestamp?: string) {
    if (!activeUser || typeof window === "undefined") return;
    const latest = timestamp || data.chatMessages.at(-1)?.createdAt || new Date().toISOString();
    const key = `${chatSeenStorageKey}-${activeUser.id}`;
    window.localStorage.setItem(key, latest);
    setLastSeenChatAt(latest);
  }

  function renderMemberPill(memberId: string) {
    const member = data.members.find((item) => item.id === memberId);
    if (!member) return null;

    return (
      <span className={styles.memberPill} style={{ borderColor: member.color }}>
        <span className={styles.memberPillAvatar} style={{ backgroundColor: member.color }}>
          {member.avatar || getBadgeText(member.name)}
        </span>
        {member.name}
      </span>
    );
  }

  function renderTaskCard(task: Task, options?: { showActions?: boolean }) {
    const member = data.members.find((item) => item.id === task.assigneeId);
    const canToggle = Boolean(activeUser && activeUser.id === task.assigneeId);

    return (
      <div key={task.id} className={`${styles.taskCard} ${task.done ? styles.taskDone : ""}`}>
        <div className={styles.taskTop}>
          <div>
            <strong>{task.title}</strong>
            <div className={styles.taskBadges}>
              <span className={`${styles.priorityBadge} ${getPriorityClass(task.priority)}`}>
                {priorityLabels[task.priority || "medium"]}
              </span>
              {member ? renderMemberPill(member.id) : null}
            </div>
          </div>
          <div className={styles.taskActions}>
            <button
              className={styles.smallButton}
              onClick={() => void toggleTask(task.id)}
              disabled={!canToggle}
            >
              {task.done ? "Vratit" : "Hotovo"}
            </button>
            {options?.showActions && canManage ? (
              <>
                <button className={styles.smallButton} onClick={() => beginEditTask(task)}>
                  Upravit
                </button>
                <button className={styles.smallDanger} onClick={() => void deleteTask(task.id)}>
                  Smazat
                </button>
              </>
            ) : null}
          </div>
        </div>
        <div className={styles.taskMeta}>
          <span>
            {task.repeatLabel} · {formatDateLabel(task.date)} · {formatTimeLabel(task.time)}
          </span>
          <span>
            {task.done
              ? "Splneno"
              : canToggle
                ? "Muzes odskrtnout"
                : "Muze odskrtnout jen prirazeny clovek"}
          </span>
        </div>
        {task.notes ? <div className={styles.taskNotes}>{task.notes}</div> : null}
      </div>
    );
  }

  function renderShoppingCard(item: ShoppingItem) {
    const member = data.members.find((entry) => entry.id === item.assigneeId);

    return (
      <div key={item.id} className={`${styles.shoppingItem} ${item.done ? styles.taskDone : ""}`}>
        <div className={styles.taskTop}>
          <div>
            <strong>{item.title}</strong>
            <div className={styles.taskBadges}>{member ? renderMemberPill(member.id) : null}</div>
          </div>
          <div className={styles.taskActions}>
            <button className={styles.smallButton} onClick={() => void toggleShoppingItem(item.id)}>
              {item.done ? "Vratit" : "Koupeno"}
            </button>
            {canManage ? (
              <>
                <button className={styles.smallButton} onClick={() => beginEditShopping(item)}>
                  Upravit
                </button>
                <button className={styles.smallDanger} onClick={() => void deleteShopping(item.id)}>
                  Smazat
                </button>
              </>
            ) : null}
          </div>
        </div>
        <div className={styles.taskMeta}>
          <span>{getRepeatLabel(item.repeatType || "none", item.repeatEvery || 1)}</span>
        </div>
        {item.notes ? <div className={styles.taskNotes}>{item.notes}</div> : null}
      </div>
    );
  }

  function renderTaskForm() {
    return (
      <form className={styles.formStack} onSubmit={(event) => void saveTask(event)}>
        <input
          value={taskForm.title}
          onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))}
          placeholder="Treba umyt nadobi"
        />
        <textarea
          className={styles.textarea}
          value={taskForm.notes}
          onChange={(event) => setTaskForm((current) => ({ ...current, notes: event.target.value }))}
          placeholder="Poznamka k ukolu"
        />
        <div className={styles.twoCols}>
          <select
            value={taskForm.assigneeId}
            onChange={(event) => setTaskForm((current) => ({ ...current, assigneeId: event.target.value }))}
          >
            {data.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <select
            value={taskForm.priority}
            onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value as Priority }))}
          >
            <option value="low">Nizka priorita</option>
            <option value="medium">Stredni priorita</option>
            <option value="high">Vysoka priorita</option>
          </select>
        </div>
        <div className={styles.twoCols}>
          <input
            type="date"
            value={taskForm.date}
            onChange={(event) => setTaskForm((current) => ({ ...current, date: event.target.value }))}
          />
          <input
            type="time"
            value={taskForm.time}
            onChange={(event) => setTaskForm((current) => ({ ...current, time: event.target.value }))}
          />
        </div>
        <div className={styles.twoCols}>
          <select
            value={taskForm.repeatType}
            onChange={(event) => setTaskForm((current) => ({ ...current, repeatType: event.target.value as RepeatType }))}
          >
            <option value="none">Jednou</option>
            <option value="daily">Kazdy den</option>
            <option value="weekly">Kazdy tyden</option>
            <option value="monthly">Kazdy mesic</option>
          </select>
          <input
            type="number"
            min="1"
            value={taskForm.repeatEvery}
            onChange={(event) => setTaskForm((current) => ({ ...current, repeatEvery: event.target.value }))}
          />
        </div>
        <div className={styles.inlineNote}>
          {getRepeatLabel(taskForm.repeatType, Number.parseInt(taskForm.repeatEvery, 10) || 1)}
        </div>
        <div className={styles.actionRow}>
          <button className={styles.primaryButton} type="submit">
            {editingTaskId ? "Ulozit zmeny" : "Pridat povinnost"}
          </button>
          {editingTaskId ? (
            <button className={styles.secondaryButton} type="button" onClick={clearTaskForm}>
              Zrusit upravu
            </button>
          ) : null}
        </div>
      </form>
    );
  }

  function renderShoppingForm() {
    return (
      <form className={styles.formStack} onSubmit={(event) => void saveShopping(event)}>
        <input
          value={shoppingForm.title}
          onChange={(event) => setShoppingForm((current) => ({ ...current, title: event.target.value }))}
          placeholder="Treba testoviny"
        />
        <textarea
          className={styles.textarea}
          value={shoppingForm.notes}
          onChange={(event) => setShoppingForm((current) => ({ ...current, notes: event.target.value }))}
          placeholder="Poznamka k nakupu"
        />
        <div className={styles.twoCols}>
          <select
            value={shoppingForm.assigneeId}
            onChange={(event) => setShoppingForm((current) => ({ ...current, assigneeId: event.target.value }))}
          >
            {data.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <select
            value={shoppingForm.repeatType}
            onChange={(event) => setShoppingForm((current) => ({ ...current, repeatType: event.target.value as RepeatType }))}
          >
            <option value="none">Jednou</option>
            <option value="daily">Kazdy den</option>
            <option value="weekly">Kazdy tyden</option>
            <option value="monthly">Kazdy mesic</option>
          </select>
        </div>
        <div className={styles.twoCols}>
          <input
            type="number"
            min="1"
            value={shoppingForm.repeatEvery}
            onChange={(event) => setShoppingForm((current) => ({ ...current, repeatEvery: event.target.value }))}
          />
          <div className={styles.inlineNote}>
            {getRepeatLabel(shoppingForm.repeatType, Number.parseInt(shoppingForm.repeatEvery, 10) || 1)}
          </div>
        </div>
        <div className={styles.actionRow}>
          <button className={styles.primaryButton} type="submit">
            {editingShoppingId ? "Ulozit polozku" : "Pridat nakup"}
          </button>
          {editingShoppingId ? (
            <button className={styles.secondaryButton} type="button" onClick={clearShoppingForm}>
              Zrusit upravu
            </button>
          ) : null}
        </div>
      </form>
    );
  }

  function renderDashboard() {
    return (
      <section className={styles.contentGrid}>
        <article className={`${styles.panel} ${styles.panelWide}`}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionTag}>Dnesek</span>
              <h2>Dnesni povinnosti</h2>
            </div>
            <span className={styles.datePill}>{formatDateLabel(todayKey)}</span>
          </div>
          <div className={styles.taskList}>
            {todayTasks.length === 0 ? <div className={styles.emptyState}>Zatim tu nejsou zadne povinnosti na dnesek.</div> : todayTasks.map((task) => renderTaskCard(task))}
          </div>
        </article>

        <article className={`${styles.panel} ${styles.accentPanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionTag}>Na tahu</span>
              <h2>{memberOnDuty ? memberOnDuty.name : "Nikdo"}</h2>
            </div>
            {memberOnDuty ? (
              <div className={styles.memberBadge} style={{ backgroundColor: memberOnDuty.color }}>
                {memberOnDuty.avatar || getBadgeText(memberOnDuty.name)}
              </div>
            ) : null}
          </div>
          <p className={styles.panelText}>
            {memberOnDuty
              ? `${memberOnDuty.name} ma dnes hlavni radu povinnosti.`
              : "Jakmile pridas prvni ukol na dnesek, objevi se tady kdo je na tahu."}
          </p>
          <div className={styles.scoreRow}>
            <div>
              <strong>{memberOnDuty ? getMonthlyPoints(memberOnDuty.id, data.taskHistory) : 0}</strong>
              <span>body tento mesic</span>
            </div>
            <div>
              <strong>{todayTasks.length}</strong>
              <span>ukolu na dnesek</span>
            </div>
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionTag}>Pridani</span>
              <h2>{editingTaskId ? "Uprava ukolu" : "Novy ukol"}</h2>
            </div>
          </div>
          {canManage ? renderTaskForm() : <div className={styles.permissionCard}>Daniel muze ukoly plnit, ale nepridava je.</div>}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionTag}>Blizi se</span>
              <h2>Dalsi dny</h2>
            </div>
          </div>
          <div className={styles.timeline}>
            {upcomingTasks.length === 0 ? (
              <div className={styles.emptyState}>Jakmile pridas dalsi ukoly, objevi se tady.</div>
            ) : (
              upcomingTasks.slice(0, 5).map((task) => {
                const member = data.members.find((item) => item.id === task.assigneeId);
                return (
                  <div key={task.id} className={styles.timelineItem}>
                    <div className={styles.timelineDot} style={{ backgroundColor: member?.color }} />
                    <div>
                      <strong>{task.title}</strong>
                      <p>{formatDateLabel(task.date)} · {formatTimeLabel(task.time)} · {member?.name}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>

        {renderRemindersPanel(true)}
      </section>
    );
  }

  function renderRemindersPanel(compact = false) {
    const items = [...reminderTasks.overdue, ...reminderTasks.today, ...reminderTasks.upcoming];
    return (
      <article className={`${styles.panel} ${compact ? "" : styles.panelFull}`}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionTag}>Pripominky</span>
            <h2>Co je potreba hlidat</h2>
          </div>
          {!notificationsEnabled ? (
            <button className={styles.secondaryButton} onClick={() => void enableNotifications()}>
              Zapnout web notifikace
            </button>
          ) : (
            <span className={styles.statusText}>Web notifikace aktivni</span>
          )}
        </div>
        <div className={styles.reminderGrid}>
          <div className={styles.reminderCard}>
            <strong>{reminderTasks.overdue.length}</strong>
            <span>po terminu</span>
          </div>
          <div className={styles.reminderCard}>
            <strong>{reminderTasks.today.length}</strong>
            <span>na dnesek</span>
          </div>
          <div className={styles.reminderCard}>
            <strong>{reminderTasks.upcoming.length}</strong>
            <span>blizi se</span>
          </div>
        </div>
        <div className={styles.taskList}>
          {items.length === 0 ? <div className={styles.emptyState}>Zadne pripominky. Vypada to, ze mas cisto.</div> : items.slice(0, compact ? 3 : 8).map((task) => renderTaskCard(task))}
        </div>
      </article>
    );
  }

  function renderCalendar() {
    const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    const startOffset = (monthStart.getDay() + 6) % 7;
    const daysInMonth = monthEnd.getDate();
    const cells: Array<{ key: string; date: string | null; dayNumber?: number }> = [];

    for (let index = 0; index < startOffset; index += 1) {
      cells.push({ key: `empty-start-${index}`, date: null });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
      cells.push({ key: date.toISOString(), date: date.toISOString().slice(0, 10), dayNumber: day });
    }
    while (cells.length % 7 !== 0) cells.push({ key: `empty-end-${cells.length}`, date: null });

    return (
      <section className={styles.singleSection}>
        <article className={`${styles.panel} ${styles.panelFull}`}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionTag}>Kalendar</span>
              <h2>Mesicni plan</h2>
            </div>
          </div>
          <div className={styles.calendarToolbar}>
            <button className={styles.secondaryButton} onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
              Predchozi
            </button>
            <strong className={styles.calendarTitle}>{getMonthLabel(calendarMonth)}</strong>
            <div className={styles.calendarActions}>
              <select value={calendarFilterUserId} onChange={(event) => setCalendarFilterUserId(event.target.value)}>
                <option value="all">Vsichni</option>
                {data.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <select value={calendarFilterStatus} onChange={(event) => setCalendarFilterStatus(event.target.value)}>
                <option value="all">Vse</option>
                <option value="open">Jen otevrene</option>
                <option value="done">Jen hotove</option>
              </select>
              <select value={calendarFilterPriority} onChange={(event) => setCalendarFilterPriority(event.target.value)}>
                <option value="all">Vsechny priority</option>
                <option value="high">Jen vysoka</option>
                <option value="medium">Jen stredni</option>
                <option value="low">Jen nizka</option>
              </select>
              <button
                className={styles.secondaryButton}
                onClick={() => {
                  const today = new Date();
                  setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                  setSelectedDate(todayKey);
                }}
              >
                Dnes
              </button>
              <button className={styles.secondaryButton} onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                Dalsi
              </button>
            </div>
          </div>

          <div className={styles.calendarWeekdays}>
            {["Po", "Ut", "St", "Ct", "Pa", "So", "Ne"].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className={styles.calendarGrid}>
            {cells.map((cell) => {
              if (!cell.date) return <div key={cell.key} className={styles.calendarCellEmpty} />;
              const tasksForDay = filteredCalendarTasks
                .filter((task) => task.date === cell.date)
                .sort((left, right) => getTaskSortKey(left).localeCompare(getTaskSortKey(right)));
              const isSelected = selectedDate === cell.date;
              const isToday = todayKey === cell.date;
              return (
                <button
                  key={cell.key}
                  className={`${styles.calendarCell} ${isSelected ? styles.calendarCellSelected : ""} ${isToday ? styles.calendarCellToday : ""}`}
                  onClick={() => setSelectedDate(cell.date!)}
                >
                  <div className={styles.calendarCellTop}>
                    <strong>{cell.dayNumber}</strong>
                    {isToday ? <span className={styles.todayBadge}>Dnes</span> : null}
                  </div>
                  {tasksForDay.length === 0 ? (
                    <div className={styles.calendarDots}>{isToday ? <span className={styles.calendarTodayHint}>Dnes</span> : null}</div>
                  ) : (
                    <div className={styles.calendarMiniList}>
                      {tasksForDay.slice(0, 2).map((task) => {
                        const member = data.members.find((item) => item.id === task.assigneeId);
                        return (
                          <div key={task.id} className={styles.calendarMiniItem}>
                            <span className={`${styles.calendarDot} ${getPriorityClass(task.priority)}`} style={{ backgroundColor: member?.color }} />
                            <small>
                              {task.time ? `${task.time} ` : ""}
                              {task.title}
                            </small>
                          </div>
                        );
                      })}
                      {tasksForDay.length > 2 ? <small className={styles.calendarMore}>+{tasksForDay.length - 2} dalsi</small> : null}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className={styles.calendarList}>
            <div className={styles.calendarSelectedHeader}>
              <strong>{formatDateLabel(selectedDate)}</strong>
              <span>{selectedDateTasks.length} ukolu</span>
            </div>
            {selectedDateTasks.length === 0 ? (
              <div className={styles.emptyState}>Na vybrany den zatim neni nic naplanovaneho.</div>
            ) : (
              selectedDateTasks.map((task) => renderTaskCard(task, { showActions: true }))
            )}
          </div>
        </article>
      </section>
    );
  }

  function renderFamily() {
    return (
      <section className={styles.singleSection}>
        <article className={`${styles.panel} ${styles.panelFull}`}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionTag}>Rodina</span>
              <h2>Body a zebricek</h2>
            </div>
          </div>
          <div className={styles.familyGrid}>
            {leaderboard.map((member, index) => (
              <div key={member.id} className={styles.memberCard}>
                <div className={styles.memberBadge} style={{ backgroundColor: member.color }}>
                  {member.avatar || getBadgeText(member.name)}
                </div>
                <strong>
                  #{index + 1} {member.name}
                </strong>
                <span>@{member.username}</span>
                <p>{member.points} bodu za splnene ukoly tento mesic</p>
                <small>{member.canManage ? "muze pridavat ukoly" : "muze jen plnit svoje ukoly"}</small>
              </div>
            ))}
          </div>
          <div className={styles.historyList}>
            {data.taskHistory.slice(0, 12).map((item) => {
              const member = data.members.find((entry) => entry.id === item.assigneeId);
              return (
                <div key={item.id} className={styles.historyItem}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{formatDateTimeLabel(item.completedAt)}</p>
                  </div>
                  <div className={styles.historyMeta}>
                    {member ? renderMemberPill(member.id) : null}
                    <span className={`${styles.priorityBadge} ${getPriorityClass(item.priority)}`}>
                      {priorityLabels[item.priority || "medium"]}
                    </span>
                  </div>
                </div>
              );
            })}
            {data.taskHistory.length === 0 ? <div className={styles.emptyState}>Historie se naplni po splneni prvnich ukolu.</div> : null}
          </div>
        </article>
      </section>
    );
  }

  function renderShopping() {
    return (
      <section className={styles.singleSection}>
        <article className={`${styles.panel} ${styles.panelFull}`}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionTag}>Nakupy</span>
              <h2>Spolecny seznam</h2>
            </div>
          </div>
          {canManage ? renderShoppingForm() : <div className={styles.permissionCard}>Daniel nema pravo pridavat nove nakupy.</div>}
          <div className={styles.shoppingList}>
            {data.shoppingItems.length === 0 ? (
              <div className={styles.emptyState}>Nakupni seznam je zatim prazdny.</div>
            ) : (
              data.shoppingItems.map(renderShoppingCard)
            )}
          </div>
        </article>
      </section>
    );
  }

  function renderMine() {
    return (
      <section className={styles.singleSection}>
        <article className={`${styles.panel} ${styles.panelFull}`}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionTag}>Moje ukoly</span>
              <h2>{`Co ma ${activeUser?.name.toLowerCase()} na starost`}</h2>
            </div>
          </div>
          {myTasks.length === 0 ? <div className={styles.emptyState}>Zatim nemas prirazeny zadny ukol.</div> : myTasks.map((task) => renderTaskCard(task, { showActions: true }))}
        </article>
      </section>
    );
  }

  function renderNotesSection() {
    return (
      <section className={styles.singleSection}>
        <article className={`${styles.panel} ${styles.panelFull}`}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionTag}>Domov</span>
              <h2>Poznamky pro domacnost</h2>
            </div>
          </div>
          <form className={styles.formStack} onSubmit={(event) => void addHouseholdNote(event)}>
            <textarea
              className={styles.textarea}
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
              placeholder="Treba v lednici je vecere nebo v sobotu prijde navsteva"
            />
            <button className={styles.primaryButton} type="submit">
              Pridat poznamku
            </button>
          </form>
          <div className={styles.notesList}>
            {data.householdNotes.map((note: HouseholdNote) => {
              const member = data.members.find((entry) => entry.id === note.authorId);
              return (
                <div key={note.id} className={styles.noteCard}>
                  <div className={styles.noteHeader}>
                    {member ? renderMemberPill(member.id) : null}
                    <span>{formatDateTimeLabel(note.createdAt)}</span>
                  </div>
                  <p>{note.body}</p>
                </div>
              );
            })}
            {data.householdNotes.length === 0 ? <div className={styles.emptyState}>Zatim tu nejsou zadne domaci poznamky.</div> : null}
          </div>
        </article>
      </section>
    );
  }

  function renderChat() {
    return (
      <section className={styles.singleSection}>
        <article className={`${styles.panel} ${styles.panelFull}`}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionTag}>Chat</span>
              <h2>Rodinna komunikace</h2>
            </div>
          </div>
          <form className={styles.chatComposer} onSubmit={(event) => void sendChatMessage(event)}>
            <input
              value={chatBody}
              onChange={(event) => setChatBody(event.target.value)}
              placeholder="Napis kratkou zpravu rodine"
            />
            <button className={styles.primaryButton} type="submit" disabled={isSendingChat}>
              {isSendingChat ? "Posilam..." : "Odeslat"}
            </button>
          </form>
          <div className={styles.chatList} onMouseEnter={() => markChatAsRead()}>
            {data.chatMessages.map((message: ChatMessage) => {
              const member = data.members.find((entry) => entry.id === message.authorId);
              const mine = activeUser?.id === message.authorId;
              return (
                <div key={message.id} className={`${styles.chatBubble} ${mine ? styles.chatBubbleMine : ""}`}>
                  <div className={styles.noteHeader}>
                    {member ? renderMemberPill(member.id) : null}
                    <span>{formatDateTimeLabel(message.createdAt)}</span>
                  </div>
                  <p>{message.body}</p>
                </div>
              );
            })}
            {data.chatMessages.length === 0 ? <div className={styles.emptyState}>Chat je zatim prazdny.</div> : null}
          </div>
        </article>
      </section>
    );
  }

  function renderAdmin() {
    if (!canOpenAdmin) return null;

    const selectedMember = data.members.find((member) => member.id === adminUserId);

    return (
      <section className={styles.singleSection}>
        <article className={`${styles.panel} ${styles.panelFull}`}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionTag}>Admin</span>
              <h2>Hesla a profily</h2>
            </div>
          </div>
          <div className={styles.adminGrid}>
            <form className={styles.formStack} onSubmit={(event) => void resetPassword(event)}>
              <strong>Zmena hesla</strong>
              <select
                value={adminUserId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setAdminUserId(nextId);
                  const member = data.members.find((item) => item.id === nextId);
                  if (member) {
                    setMemberColor(member.color);
                    setMemberAvatar(member.avatar || getBadgeText(member.name));
                  }
                }}
              >
                {data.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Nove heslo"
              />
              <button className={styles.primaryButton} type="submit">
                Ulozit nove heslo
              </button>
            </form>

            <form className={styles.formStack} onSubmit={(event) => void saveMemberProfile(event)}>
              <strong>Barva a avatar</strong>
              <div className={styles.profilePreview}>
                <div className={styles.memberBadgeLarge} style={{ backgroundColor: memberColor }}>
                  {memberAvatar || selectedMember?.avatar || "NA"}
                </div>
                <div>
                  <strong>{selectedMember?.name}</strong>
                  <p>Uprav si barvu a zkratku profilu.</p>
                </div>
              </div>
              <div className={styles.twoCols}>
                <input type="color" value={memberColor} onChange={(event) => setMemberColor(event.target.value)} />
                <input value={memberAvatar} maxLength={2} onChange={(event) => setMemberAvatar(event.target.value.toUpperCase())} />
              </div>
              <button className={styles.primaryButton} type="submit">
                Ulozit profil
              </button>
            </form>
          </div>
          {adminMessage ? <p className={styles.statusText}>{adminMessage}</p> : null}
        </article>
      </section>
    );
  }

  if (loading) {
    return (
      <main className={styles.pageShell}>
        <section className={styles.loadingState}>
          <span className={styles.kicker}>NaTahu</span>
          <h1>Nacitani rodinneho organizeru...</h1>
        </section>
      </main>
    );
  }

  if (!activeUser) {
    return (
      <main className={styles.pageShell}>
        <section className={styles.loadingState}>
          <div className={styles.loginGate}>
            <span className={styles.kicker}>Soukroma rodinna aplikace</span>
            <h1>NaTahu</h1>
            <p>Bez prihlaseni nejsou rodinna data pristupna. Prihlas se svym jmenem a heslem.</p>
            {bootstrapError ? (
              <div className={styles.errorCard}>
                <strong>Aplikace se nepodarilo nacist.</strong>
                <p>{bootstrapError}</p>
                <button className={styles.secondaryButton} onClick={() => void loadBootstrap(true)}>
                  Zkusit znovu
                </button>
              </div>
            ) : null}
            <form className={styles.loginForm} onSubmit={(event) => void handleLogin(event)}>
              <label>
                Jmeno
                <input name="username" autoComplete="username" />
              </label>
              <label>
                Heslo
                <input name="password" type="password" autoComplete="current-password" />
              </label>
              <button className={styles.primaryButton} type="submit">
                Prihlasit se
              </button>
            </form>
            {loginError ? <p className={styles.error}>{loginError}</p> : null}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.pageShell}>
      <div className={styles.appLayout}>
        <aside className={styles.sidebar}>
          <div className={styles.brandBlock}>
            <span className={styles.kicker}>Rodinny organizer</span>
            <h1>NaTahu</h1>
            <p>Ukoly, nakupy, chat, domaci poznamky a pripominky na jednom miste.</p>
          </div>

          <nav className={styles.navList}>
            {sections.map((section) => (
              <button
                key={section.id}
                className={`${styles.navItem} ${activeSection === section.id ? styles.navItemActive : ""}`}
                onClick={() => {
                  setActiveSection(section.id);
                  if (section.id === "chat") markChatAsRead();
                }}
              >
                <strong className={styles.navLabel}>
                  {section.label}
                  {section.id === "chat" && unreadChatCount > 0 ? <span className={styles.unreadDot} /> : null}
                </strong>
                <span>{section.hint}</span>
              </button>
            ))}
          </nav>

          <div className={styles.loginCard}>
            <div className={styles.cardLabel}>Prihlaseni</div>
            <div className={styles.loggedInBox}>
              <div className={styles.memberBadge} style={{ backgroundColor: activeUser.color }}>
                {activeUser.avatar || getBadgeText(activeUser.name)}
              </div>
              <div>
                <strong>{activeUser.name}</strong>
                <p>{activeUser.canManage ? "Muzes spravovat cely domov." : "Muzes plnit svoje ukoly a komunikovat."}</p>
              </div>
              <button className={styles.secondaryButton} onClick={() => void handleLogout()}>
                Odhlasit
              </button>
            </div>
          </div>
        </aside>

        <section className={styles.mainColumn}>
          <header className={styles.topbar}>
            <div>
              <span className={styles.sectionTag}>Aktualni stav</span>
              <h2>Prihlasen: {activeUser.name}</h2>
            </div>
            <div className={styles.topbarMeta}>
              <span>{saving ? "Ukladam..." : "Ulozeno"}</span>
              <span>{formatDateLabel(todayKey)}</span>
              <button className={styles.secondaryButton} onClick={() => void handleLogout()}>
                Odhlasit
              </button>
            </div>
          </header>

          <div className={styles.mobileNav}>
            {sections.map((section) => (
              <button
                key={section.id}
                className={`${styles.mobileNavItem} ${activeSection === section.id ? styles.mobileNavItemActive : ""}`}
                onClick={() => {
                  setActiveSection(section.id);
                  if (section.id === "chat") markChatAsRead();
                }}
              >
                {section.label}
                {section.id === "chat" && unreadChatCount > 0 ? <span className={styles.unreadDotMobile} /> : null}
              </button>
            ))}
          </div>

          {activeSection === "dashboard" ? renderDashboard() : null}
          {activeSection === "calendar" ? renderCalendar() : null}
          {activeSection === "family" ? renderFamily() : null}
          {activeSection === "shopping" ? renderShopping() : null}
          {activeSection === "mine" ? renderMine() : null}
          {activeSection === "reminders" ? <section className={styles.singleSection}>{renderRemindersPanel()}</section> : null}
          {activeSection === "notes" ? renderNotesSection() : null}
          {activeSection === "chat" ? renderChat() : null}
          {activeSection === "admin" ? renderAdmin() : null}
        </section>
      </div>
    </main>
  );
}
