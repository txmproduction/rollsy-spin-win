import { createServerFn } from "@tanstack/react-start";
import {
  contactSchema,
  spinSchema,
  passwordSchema,
  insertClientContact,
  decideAndRecordSpin,
  loadAdminData,
  adminPassword,
} from "./rollsy.server";

export const createClientContact = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => contactSchema.parse(data))
  .handler(async ({ data }) => insertClientContact(data));

export const spinWheel = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => spinSchema.parse(data))
  .handler(async ({ data }) => decideAndRecordSpin(data.clientId ?? null));

export const getAdminData = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => passwordSchema.parse(data))
  .handler(async ({ data }) => loadAdminData(data.password));

export const verifyAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => passwordSchema.parse(data))
  .handler(async ({ data }) => ({ ok: data.password === adminPassword() }));
