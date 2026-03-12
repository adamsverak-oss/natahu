"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import type { AppData, Task } from "@/lib/app-data";
import type { SessionUser } from "@/lib/types";
import { getRepeatLabel } from "@/lib/repeat";

type SectionId =
  | "dashboard"
  | "calendar"
  | "family"
  | "shopping"
  | "mine"
  | "reminders"
  | "admin";

type BootstrapPayload = {
  user: SessionUser;
  data: AppData;
};

const emptyData: AppData = {
  members: [],
  tasks: [],
  shoppingItems: [],
};

const baseSections: Array<{ id: Exclude<SectionId, "admin">; label: string; hint: string }> = [
  { id: "dashboard", label: "Prehled", hint: "Dnesek a rychle akce" },
  { id: "calendar", label: "Kalendar", hint: "Vsechny terminy" },
  { id: "family", label: "Rodina", hint: "Mesicni statistiky" },
  { id: "shopping", label: "Nakupy", hint: "Spolecny seznam" },
  { id: "mine", label: "Moje ukoly", hint: "Jen moje povinnosti" },
  { id: "reminders", label: "Pripominky", hint: "Co hori a co se blizi" },
];

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

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function getCompletedCount(memberId: string, tasks: Task[]) {
  const monthKey = getCurrentMonthKey();
  return tasks.filter(
    (task) => task.assigneeId === memberId && task.done && task.completedAt?.startsWith(monthKey)
  ).length;
}

function getTaskSortKey(task: Task) {
  return `${task.date}-${task.time ?? "99:99"}-${task.title}`;
}

export default function HomePage() {
  const [data, setData] = useState<AppData>(emptyData);
  const [activeUser, setActiveUser] = useState<SessionUser | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("dashboard");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskDate, setTaskDate] = useState(getTodayKey());
  const [taskTime, setTaskTime] = useState("18:00");
  const [repeatType, setRepeatType] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [repeatEvery, setRepeatEvery] = useState("1");
  const [shoppingTitle, setShoppingTitle] = useState("");
  const [shoppingAssigneeId, setShoppingAssigneeId] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(getTodayKey());
  const [adminUserId, setAdminUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [adminMessage, setAdminMessage] = useState("");

  const canManage = activeUser?.canManage ?? false;
  const todayKey = getTodayKey();
  const sections = canManage
    ? [...baseSections, { id: "admin" as const, label: "Admin", hint: "Hesla a sprava" }]
    : baseSections;

  async function loadBootstrap(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    }

    const response = await fetch("/api/bootstrap", {
      cache: "no-store",
      credentials: "include",
    });

    if (response.status === 401) {
      setActiveUser(null);
      setData(emptyData);
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as BootstrapPayload;
    setActiveUser(payload.user);
    setData(payload.data);
    setTaskAssigneeId((current) => current || payload.data.members[0]?.id || "");
    setShoppingAssigneeId((current) => current || payload.data.members[0]?.id || "");
    setAdminUserId((current) => current || payload.data.members[0]?.id || "");
    setLoading(false);
  }

  useEffect(() => {
    void loadBootstrap(true);
  }, []);

  const todayTasks = useMemo(
    () => data.tasks.filter((task) => task.date === todayKey),
    [data.tasks, todayKey]
  );

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
      data.tasks
        .filter((task) => task.date === selectedDate)
        .sort((left, right) => getTaskSortKey(left).localeCompare(getTaskSortKey(right))),
    [data.tasks, selectedDate]
  );

  const reminderTasks = useMemo(() => {
    const mine = data.tasks.filter((task) => task.assigneeId === activeUser?.id && !task.done);
    return {
      overdue: mine.filter((task) => task.date < todayKey),
      today: mine.filter((task) => task.date === todayKey),
      upcoming: mine.filter((task) => task.date > todayKey).slice(0, 5),
    };
  }, [activeUser?.id, data.tasks, todayKey]);

  const memberOnDuty = todayTasks[0]
    ? data.members.find((member) => member.id === todayTasks[0].assigneeId) ?? null
    : null;

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
      if (response.status === 401) {
        await loadBootstrap();
      }

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

  async function toggleTask(taskId: string) {
    if (!activeUser) {
      return;
    }

    try {
      await runMutation(`/api/tasks/${taskId}/toggle`);
    } catch {}
  }

  async function toggleShoppingItem(itemId: string) {
    if (!activeUser) {
      return;
    }

    try {
      await runMutation(`/api/shopping/${itemId}/toggle`);
    } catch {}
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeUser || !canManage || !taskTitle.trim() || !taskAssigneeId) {
      return;
    }

    try {
      await runMutation("/api/tasks", {
        title: taskTitle.trim(),
        assigneeId: taskAssigneeId,
        date: taskDate,
        time: taskTime || null,
        repeatType,
        repeatEvery: Number.parseInt(repeatEvery, 10) || 1,
      });
      setTaskTitle("");
      setTaskTime("18:00");
      setRepeatType("none");
      setRepeatEvery("1");
    } catch {}
  }

  async function addShoppingItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeUser || !canManage || !shoppingTitle.trim() || !shoppingAssigneeId) {
      return;
    }

    try {
      await runMutation("/api/shopping", {
        title: shoppingTitle.trim(),
        assigneeId: shoppingAssigneeId,
      });
      setShoppingTitle("");
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

  function renderTaskCard(task: Task) {
    const member = data.members.find((item) => item.id === task.assigneeId);
    const canToggle = Boolean(activeUser && activeUser.id === task.assigneeId);

    return (
      <button
        key={task.id}
        className={`${styles.taskCard} ${task.done ? styles.taskDone : ""} ${!canToggle ? styles.taskLocked : ""}`}
        onClick={() => void toggleTask(task.id)}
        disabled={!canToggle}
      >
        <div className={styles.taskTop}>
          <strong>{task.title}</strong>
          <span style={{ color: member?.color }}>{member?.name}</span>
        </div>
        <div className={styles.taskMeta}>
          <span>
            {task.repeatLabel} · {formatTimeLabel(task.time)}
          </span>
          <span>
            {task.done
              ? "Splneno"
              : canToggle
                ? "Muzes odskrtnout"
                : "Muze odskrtnout jen prirazeny clovek"}
          </span>
        </div>
      </button>
    );
  }

  function renderRemindersPanel(compact = false) {
    return (
      <article className={`${styles.panel} ${compact ? "" : styles.panelFull}`}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.sectionTag}>Pripominky</span>
            <h2>Co je potreba hlidat</h2>
          </div>
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
          {[...reminderTasks.overdue, ...reminderTasks.today, ...reminderTasks.upcoming]
            .slice(0, compact ? 3 : 8)
            .map(renderTaskCard)}
          {reminderTasks.overdue.length + reminderTasks.today.length + reminderTasks.upcoming.length === 0 ? (
            <div className={styles.emptyState}>Zadne pripominky. Vypada to, ze mas cisto.</div>
          ) : null}
        </div>
      </article>
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
            {todayTasks.length === 0 ? (
              <div className={styles.emptyState}>Zatim tu nejsou zadne povinnosti na dnesek.</div>
            ) : (
              todayTasks.map(renderTaskCard)
            )}
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
                {getInitials(memberOnDuty.name)}
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
              <strong>{memberOnDuty ? getCompletedCount(memberOnDuty.id, data.tasks) : 0}</strong>
              <span>splneno tento mesic</span>
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
              <h2>Novy ukol</h2>
            </div>
          </div>
          {canManage ? (
            <form className={styles.formStack} onSubmit={(event) => void addTask(event)}>
              <input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Treba umyt nadobi"
              />
              <div className={styles.twoCols}>
                <select value={taskAssigneeId} onChange={(event) => setTaskAssigneeId(event.target.value)}>
                  {data.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <input type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} />
              </div>
              <div className={styles.twoCols}>
                <input type="time" value={taskTime} onChange={(event) => setTaskTime(event.target.value)} />
                <select value={repeatType} onChange={(event) => setRepeatType(event.target.value as typeof repeatType)}>
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
                  value={repeatEvery}
                  onChange={(event) => setRepeatEvery(event.target.value)}
                />
                <div className={styles.inlineNote}>
                  {getRepeatLabel(repeatType, Number.parseInt(repeatEvery, 10) || 1)}
                </div>
              </div>
              <button className={styles.primaryButton} type="submit">
                Pridat povinnost
              </button>
            </form>
          ) : (
            <div className={styles.permissionCard}>
              Daniel muze ukoly plnit, ale nepridava je.
            </div>
          )}
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
                      <p>
                        {formatDateLabel(task.date)} · {formatTimeLabel(task.time)} · {member?.name}
                      </p>
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
      const iso = date.toISOString().slice(0, 10);
      cells.push({ key: iso, date: iso, dayNumber: day });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ key: `empty-end-${cells.length}`, date: null });
    }

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
            <button
              className={styles.secondaryButton}
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
            >
              Predchozi
            </button>
            <strong className={styles.calendarTitle}>{getMonthLabel(calendarMonth)}</strong>
            <button
              className={styles.secondaryButton}
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
            >
              Dalsi
            </button>
          </div>

          <div className={styles.calendarWeekdays}>
            {["Po", "Ut", "St", "Ct", "Pa", "So", "Ne"].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className={styles.calendarGrid}>
            {cells.map((cell) => {
              if (!cell.date) {
                return <div key={cell.key} className={styles.calendarCellEmpty} />;
              }

              const tasksForDay = data.tasks
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
                    <div className={styles.calendarDots}>
                      {isToday ? <span className={styles.calendarTodayHint}>Dnes</span> : null}
                    </div>
                  ) : (
                    <div className={styles.calendarMiniList}>
                      {tasksForDay.slice(0, 2).map((task) => {
                        const member = data.members.find((item) => item.id === task.assigneeId);
                        return (
                          <div key={task.id} className={styles.calendarMiniItem}>
                            <span className={styles.calendarDot} style={{ backgroundColor: member?.color }} />
                            <small>
                              {task.time ? `${task.time} ` : ""}
                              {task.title}
                            </small>
                          </div>
                        );
                      })}
                      {tasksForDay.length > 2 ? (
                        <small className={styles.calendarMore}>+{tasksForDay.length - 2} dalsi</small>
                      ) : null}
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
              selectedDateTasks.map((task) => {
                const member = data.members.find((item) => item.id === task.assigneeId);
                return (
                  <div key={task.id} className={styles.calendarRow}>
                    <div>
                      <strong>{task.title}</strong>
                      <p>
                        {task.repeatLabel} · {formatTimeLabel(task.time)}
                      </p>
                    </div>
                    <div className={styles.calendarMeta}>
                      <span style={{ color: member?.color }}>{member?.name}</span>
                      <span>{task.done ? "Splneno" : "Ceka"}</span>
                    </div>
                  </div>
                );
              })
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
              <h2>Mesicni prehled</h2>
            </div>
          </div>
          <div className={styles.familyGrid}>
            {data.members.map((member) => (
              <div key={member.id} className={styles.memberCard}>
                <div className={styles.memberBadge} style={{ backgroundColor: member.color }}>
                  {getInitials(member.name)}
                </div>
                <strong>{member.name}</strong>
                <span>@{member.username}</span>
                <p>{getCompletedCount(member.id, data.tasks)} splnenych ukolu tento mesic</p>
                <small>{member.canManage ? "muze pridavat ukoly" : "muze jen plnit svoje ukoly"}</small>
              </div>
            ))}
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
          {canManage ? (
            <form className={styles.inlineForm} onSubmit={(event) => void addShoppingItem(event)}>
              <input
                value={shoppingTitle}
                onChange={(event) => setShoppingTitle(event.target.value)}
                placeholder="Treba testoviny"
              />
              <select value={shoppingAssigneeId} onChange={(event) => setShoppingAssigneeId(event.target.value)}>
                {data.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <button className={styles.primaryButton} type="submit">
                Pridat
              </button>
            </form>
          ) : (
            <div className={styles.permissionCard}>Daniel nema pravo pridavat nove nakupy.</div>
          )}
          <div className={styles.shoppingList}>
            {data.shoppingItems.length === 0 ? (
              <div className={styles.emptyState}>Nakupni seznam je zatim prazdny.</div>
            ) : (
              data.shoppingItems.map((item) => {
                const member = data.members.find((entry) => entry.id === item.assigneeId);
                return (
                  <button
                    key={item.id}
                    className={`${styles.shoppingItem} ${item.done ? styles.taskDone : ""}`}
                    onClick={() => void toggleShoppingItem(item.id)}
                  >
                    <strong>{item.title}</strong>
                    <span style={{ color: member?.color }}>{member?.name}</span>
                  </button>
                );
              })
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
          {myTasks.length === 0 ? (
            <div className={styles.emptyState}>Zatim nemas prirazeny zadny ukol.</div>
          ) : (
            <div className={styles.taskList}>{myTasks.map(renderTaskCard)}</div>
          )}
        </article>
      </section>
    );
  }

  function renderReminders() {
    return <section className={styles.singleSection}>{renderRemindersPanel()}</section>;
  }

  function renderAdmin() {
    if (!canManage) {
      return null;
    }

    return (
      <section className={styles.singleSection}>
        <article className={`${styles.panel} ${styles.panelFull}`}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.sectionTag}>Admin</span>
              <h2>Zmena hesel</h2>
            </div>
          </div>
          <form className={styles.formStack} onSubmit={(event) => void resetPassword(event)}>
            <div className={styles.twoCols}>
              <select value={adminUserId} onChange={(event) => setAdminUserId(event.target.value)}>
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
            </div>
            <div className={styles.inlineNote}>Po zmene hesla se dotycny uzivatel odhlasi ze vsech zarizeni.</div>
            <button className={styles.primaryButton} type="submit">
              Ulozit nove heslo
            </button>
            {adminMessage ? <p className={styles.statusText}>{adminMessage}</p> : null}
          </form>
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
            <p>Hotove ukoly se pocitaji po mesicich, opakovane se sami planuji dal a admin umi resetovat hesla.</p>
          </div>

          <nav className={styles.navList}>
            {sections.map((section) => (
              <button
                key={section.id}
                className={`${styles.navItem} ${activeSection === section.id ? styles.navItemActive : ""}`}
                onClick={() => setActiveSection(section.id)}
              >
                <strong>{section.label}</strong>
                <span>{section.hint}</span>
              </button>
            ))}
          </nav>

          <div className={styles.loginCard}>
            <div className={styles.cardLabel}>Prihlaseni</div>
            <div className={styles.loggedInBox}>
              <div className={styles.memberBadge} style={{ backgroundColor: activeUser.color }}>
                {getInitials(activeUser.name)}
              </div>
              <div>
                <strong>{activeUser.name}</strong>
                <p>{activeUser.canManage ? "Muzes pridavat i spravovat ukoly." : "Muzes plnit jen svoje ukoly."}</p>
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
            </div>
          </header>

          <div className={styles.mobileNav}>
            {sections.map((section) => (
              <button
                key={section.id}
                className={`${styles.mobileNavItem} ${activeSection === section.id ? styles.mobileNavItemActive : ""}`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </div>

          {activeSection === "dashboard" ? renderDashboard() : null}
          {activeSection === "calendar" ? renderCalendar() : null}
          {activeSection === "family" ? renderFamily() : null}
          {activeSection === "shopping" ? renderShopping() : null}
          {activeSection === "mine" ? renderMine() : null}
          {activeSection === "reminders" ? renderReminders() : null}
          {activeSection === "admin" ? renderAdmin() : null}
        </section>
      </div>
    </main>
  );
}
