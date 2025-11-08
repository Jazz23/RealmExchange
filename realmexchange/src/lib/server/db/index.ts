import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export let db: ReturnType<typeof drizzle>;

export function setDb(database: D1Database) {
    db ??= drizzle(database, { schema });
}