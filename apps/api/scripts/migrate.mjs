// Apply pending Prisma migrations during the Vercel *production* build, before `next build`.
// Preview and local builds skip this: previews must not migrate the production database.
import { execSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "production") {
  console.log("migrate: skipped (not a Vercel production build)");
  process.exit(0);
}
if (!process.env.DIRECT_URL) {
  console.error("migrate: DIRECT_URL is not set; refusing to build without migrating");
  process.exit(1);
}
execSync("npx prisma migrate deploy", { stdio: "inherit" });
