import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.ts";
import { requireEnv } from "../helpers/env.ts";

export const db = drizzle(requireEnv("DATABASE_URL"), {
  schema,
});

// node-postgres emits idle-client failures on the pool. Without a listener,
// EventEmitter treats an `error` event as an uncaught exception.
db.$client.on("error", (error) => {
  console.error("Postgres pool emitted an idle client error", error);
});
