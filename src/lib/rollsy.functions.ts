import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import {
  contactSchema,
  spinSchema,
  passwordSchema,
  settingsSchema,
  insertClientContact,
  decideAndRecordSpin,
  loadAdminData,
  resetAllData,
  adminPassword,
  getPublicSettings,
  saveSettings,
} from "./rollsy.server";

export const resetRollsyData = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => passwordSchema.parse(data))
  .handler(async ({ data }) => resetAllData(data.password));

export const createClientContact = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    const forwarded = getRequestHeader("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0]!.trim() : null;
    return insertClientContact({ ...data, ip });
  });

export const spinWheel = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => spinSchema.parse(data))
  .handler(async ({ data }) => decideAndRecordSpin(data.clientId ?? null));

export const getAdminData = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => passwordSchema.parse(data))
  .handler(async ({ data }) => loadAdminData(data.password));

export const verifyAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => passwordSchema.parse(data))
  .handler(async ({ data }) => ({ ok: data.password === adminPassword() }));

export const fetchPublicSettings = createServerFn({ method: "GET" }).handler(async () =>
  getPublicSettings(),
);

export const updateSettings = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => settingsSchema.parse(data))
  .handler(async ({ data }) => saveSettings(data.password, data.values));
