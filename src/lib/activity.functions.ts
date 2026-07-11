import { createServerFn } from "@tanstack/react-start";
import { desc, eq, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";
import { activity_logs, profiles } from "@/lib/db/schema";
import { getUserTenant } from "@/lib/db/helpers";

export const getActivityLogs = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const tenantId = await getUserTenant(userId);
    if (!tenantId) throw new Error("No firm found for your account");

    const db = getDb();

    const rows = await db
      .select()
      .from(activity_logs)
      .where(eq(activity_logs.tenant_id, tenantId))
      .orderBy(desc(activity_logs.created_at))
      .limit(200);

    const userIds = [...new Set(rows.map((l) => l.user_id).filter(Boolean) as string[])];
    const nameMap = new Map<string, string>();
    if (userIds.length) {
      const profs = await db
        .select({ id: profiles.id, full_name: profiles.full_name })
        .from(profiles)
        .where(inArray(profiles.id, userIds));
      profs.forEach((p) => nameMap.set(p.id, p.full_name));
    }

    return rows.map((l) => ({
      id: l.id,
      action: l.action,
      entity_type: l.entity_type,
      user_id: l.user_id,
      created_at: l.created_at.toISOString(),
      userName: l.user_id ? (nameMap.get(l.user_id) ?? "User") : "System",
    }));
  });
