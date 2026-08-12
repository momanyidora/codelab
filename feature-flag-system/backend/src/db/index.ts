import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "../config/env.js";
import * as schema from "./schema/index.js";

const client = postgres(env.databaseUrl);

export const db = drizzle(client,{
    schema,
})
