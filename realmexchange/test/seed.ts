import { drizzle } from "drizzle-orm/node-postgres";
import { seed } from "drizzle-seed";
import { user } from "$lib/server/db/schema";
import { getDb } from "$lib/server/db";

async function main() {
  const db = getDb(process?.env?.DB, process.env?.DATABASE_URL);
  await seed(db, { user });
}

main();
