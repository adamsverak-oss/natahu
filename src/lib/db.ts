import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __natahuSql: ReturnType<typeof postgres> | undefined;
}

function getDatabaseUrl() {
  const value = process.env.DATABASE_URL;

  if (!value) {
    throw new Error("Missing DATABASE_URL environment variable.");
  }

  return value;
}

export function getSql() {
  if (!global.__natahuSql) {
    global.__natahuSql = postgres(getDatabaseUrl(), {
      ssl: "require",
    });
  }

  return global.__natahuSql;
}
