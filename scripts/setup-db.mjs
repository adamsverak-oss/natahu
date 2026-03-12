import postgres from "postgres";
import { randomBytes, scryptSync } from "node:crypto";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Missing DATABASE_URL.");
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  ssl: "require",
});

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

const users = [
  { id: "adam", name: "Adam", username: "adam", password: "natahu123", color: "#ff7a18", avatar: "AD", canManage: true },
  { id: "veronika", name: "Veronika", username: "veronika", password: "rodina123", color: "#2d8f85", avatar: "VE", canManage: true },
  { id: "gustav", name: "Gustav", username: "gustav", password: "domov123", color: "#d7617d", avatar: "GU", canManage: true },
  { id: "daniel", name: "Daniel", username: "daniel", password: "ukol123", color: "#edc15c", avatar: "DA", canManage: false },
];

await sql.begin(async (tx) => {
  await tx`create extension if not exists pgcrypto`;

  await tx`
    create table if not exists users (
      id text primary key,
      name text not null,
      username text not null unique,
      password_hash text not null,
      color text not null,
      avatar text not null default 'NA',
      can_manage boolean not null default false,
      created_at timestamptz not null default now()
    )
  `;

  await tx`alter table users add column if not exists avatar text not null default 'NA'`;

  await tx`
    create table if not exists tasks (
      id uuid primary key default gen_random_uuid(),
      title text not null,
      notes text,
      assignee_id text not null references users(id) on delete cascade,
      task_date date not null,
      task_time time,
      priority text not null default 'medium',
      repeat_type text not null default 'none',
      repeat_every integer not null default 1,
      repeat_label text not null default 'Jednorazove',
      done boolean not null default false,
      completed_at timestamptz,
      created_at timestamptz not null default now()
    )
  `;

  await tx`alter table tasks add column if not exists notes text`;
  await tx`alter table tasks add column if not exists priority text not null default 'medium'`;
  await tx`alter table tasks add column if not exists repeat_type text not null default 'none'`;
  await tx`alter table tasks add column if not exists repeat_every integer not null default 1`;

  await tx`
    create table if not exists shopping_items (
      id uuid primary key default gen_random_uuid(),
      title text not null,
      notes text,
      assignee_id text not null references users(id) on delete cascade,
      done boolean not null default false,
      repeat_type text not null default 'none',
      repeat_every integer not null default 1,
      created_at timestamptz not null default now()
    )
  `;

  await tx`alter table shopping_items add column if not exists notes text`;
  await tx`alter table shopping_items add column if not exists repeat_type text not null default 'none'`;
  await tx`alter table shopping_items add column if not exists repeat_every integer not null default 1`;

  await tx`
    create table if not exists sessions (
      token_hash text primary key,
      user_id text not null references users(id) on delete cascade,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    )
  `;

  await tx`
    create table if not exists task_history (
      id uuid primary key default gen_random_uuid(),
      task_id uuid,
      title text not null,
      notes text,
      assignee_id text not null references users(id) on delete cascade,
      priority text not null default 'medium',
      completed_at timestamptz not null default now()
    )
  `;

  await tx`
    create table if not exists household_notes (
      id uuid primary key default gen_random_uuid(),
      body text not null,
      author_id text not null references users(id) on delete cascade,
      created_at timestamptz not null default now()
    )
  `;

  await tx`
    create table if not exists chat_messages (
      id uuid primary key default gen_random_uuid(),
      body text not null,
      author_id text not null references users(id) on delete cascade,
      created_at timestamptz not null default now()
    )
  `;

  await tx`
    create table if not exists photo_posts (
      id uuid primary key default gen_random_uuid(),
      image_url text not null,
      caption text,
      author_id text not null references users(id) on delete cascade,
      created_at timestamptz not null default now()
    )
  `;

  for (const user of users) {
    await tx`
      insert into users (id, name, username, password_hash, color, avatar, can_manage)
      values (
        ${user.id},
        ${user.name},
        ${user.username},
        ${hashPassword(user.password)},
        ${user.color},
        ${user.avatar},
        ${user.canManage}
      )
      on conflict (id) do update set
        name = excluded.name,
        username = excluded.username,
        color = excluded.color,
        avatar = excluded.avatar,
        can_manage = excluded.can_manage
    `;
  }
});

await sql.end();
console.log("Database setup complete.");
