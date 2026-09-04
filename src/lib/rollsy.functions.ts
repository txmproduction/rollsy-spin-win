import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  contactSchema,
  spinSchema,
  slugSchema,
  signupSchema,
  setupSchema,
  codeSchema,
  insertClientContact,
  decideAndRecordSpin,
  getPublicMerchant,
  findMerchantByOwner,
  ensureMerchantForUser,
  saveMerchantSetup,
  loadMerchantAdminData,
  resetMerchantData,
  setSpinCodeUsed,
  getAccessStateForUser,
  listAllMerchants,
  updateMerchantAccess,
  accessUpdateSchema,
  assertSuperAdmin,
} from "./rollsy.server";

export const fetchMerchant = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => slugSchema.parse(data))
  .handler(async ({ data }) => getPublicMerchant(data.slug));

export const createClientContact = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    const forwarded = getRequestHeader("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0]!.trim() : null;
    return insertClientContact({ ...data, ip });
  });

export const spinWheel = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => spinSchema.parse(data))
  .handler(async ({ data }) => decideAndRecordSpin(data.slug, data.clientId ?? null));

// ---------- Authentifié (commerçant) ----------

export const getMyMerchant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => findMerchantByOwner(context.userId));

export const completeSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => signupSchema.partial().parse(data ?? {}))
  .handler(async ({ context, data }) => {
    const email = (context.claims.email as string) ?? data.email ?? "";
    const profile = signupSchema.safeParse({ ...data, email });
    return ensureMerchantForUser(context.userId, email, profile.success ? profile.data : null);
  });

export const saveWheelSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => setupSchema.parse(data))
  .handler(async ({ context, data }) => saveMerchantSetup(context.userId, data));

export const getMerchantAdminData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => loadMerchantAdminData(context.userId));

export const markSpinCodeUsed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => codeSchema.parse(data))
  .handler(async ({ context, data }) => setSpinCodeUsed(context.userId, data.spinId, data.used));

export const resetRollsyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => resetMerchantData(context.userId));

// ---------- Accès & super admin ----------

export const getMyAccessState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getAccessStateForUser(context.userId));

export const amISuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      await assertSuperAdmin(context.userId);
      return { superAdmin: true as const };
    } catch {
      return { superAdmin: false as const };
    }
  });

export const listMerchantsForSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listAllMerchants(context.userId));

export const setMerchantAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => accessUpdateSchema.parse(data))
  .handler(async ({ context, data }) => updateMerchantAccess(context.userId, data));
