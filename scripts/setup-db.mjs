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
  {
    id: "adam",
    name: "Adam",
    username: "adam",
    password: "natahu123",
    color: "#ff7a18",
    canManage: true,
  },
  {
    id: "veronika",
    name: "Veronika",
    username: "veronika",
    password: "rodina123",
    color: "#2d8f85",
    canManage: true,
  },
  {
    id: "gustav",
    name: "Gustav",
    username: "gustav",
    password: "domov123",
    color: "#d7617d",
    canManage: true,
  },
  {
    id: "daniel",
    name: "Daniel",
    username: "daniel",
    password: "ukol123",
    color: "#edc15c",
    canManage: false,
  },
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
      can_manage boolean not null default false,
      created_at timestamptz not null default now()
    )
  `;

  await tx`
    create table if not exists tasks (
      id uuid primary key default gen_random_uuid(),
      title text not null,
      assignee_id text not null references users(id) on delete cascade,
      task_date date not null,
      task_time time,
      repeat_type text not null default 'none',
      repeat_every integer not null default 1,
      repeat_label text not null default 'Jednorazove',
      done boolean not null default false,
      completed_at timestamptz,
      created_at timestamptz not null default now()
    )
  `;

  await tx`
    alter table tasks
    add column if not exists repeat_type text not null default 'none'
  `;

  await tx`
    alter table tasks
    add column if not exists repeat_every integer not null default 1
  `;

  await tx`
    create table if not exists shopping_items (
      id uuid primary key default gen_random_uuid(),
      title text not null,
      assignee_id text not null references users(id) on delete cascade,
      done boolean not null default false,
      created_at timestamptz not null default now()
    )
  `;

  await tx`
    create table if not exists sessions (
      token_hash text primary key,
      user_id text not null references users(id) on delete cascade,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    )
  `;

  for (const user of users) {
    await tx`
      insert into users (id, name, username, password_hash, color, can_manage)
      values (${user.id}, ${user.name}, ${user.username}, ${hashPassword(user.password)}, ${user.color}, ${user.canManage})
      on conflict (id) do update set
        name = excluded.name,
        username = excluded.username,
        color = excluded.color,
        can_manage = excluded.can_manage
    `;
  }
});

await sql.end();
console.log("Database setup complete.");
