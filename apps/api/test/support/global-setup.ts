import { execSync } from "node:child_process";

/** Reset the integration database and apply migrations once per run. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;
  execSync(`psql "${url}" -q -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"`, {
    stdio: "inherit",
  });
  execSync("npx prisma migrate deploy", {
    stdio: "ignore",
    env: { ...process.env, DIRECT_URL: url, DATABASE_URL: url },
  });
}
