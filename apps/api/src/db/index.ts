import { randomUUID } from "crypto";

export { initDb, getErpPool } from "./init.js";
export { LabDbClient, openLabClient, withLabClient, type LabConfigDb } from "./client.js";

export function newId() {
  return randomUUID();
}
