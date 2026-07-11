import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";
import {
  clients,
  document_requests,
  financial_years,
  request_items,
} from "@/lib/db/schema";
import { getUserTenant } from "@/lib/db/helpers";

export const getPortalRequests = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const tenantId = await getUserTenant(userId);
    if (!tenantId) throw new Error("No firm found for your account");

    const db = getDb();

    // Find the client record linked to this portal user
    const clientRows = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.portal_user_id, userId))
      .limit(1);

    if (!clientRows[0]) return [];

    const clientId = clientRows[0].id;

    const requestRows = await db
      .select({
        id: document_requests.id,
        title: document_requests.title,
        status: document_requests.status,
        created_at: document_requests.created_at,
        financial_year_id: document_requests.financial_year_id,
      })
      .from(document_requests)
      .where(eq(document_requests.client_id, clientId))
      .orderBy(desc(document_requests.created_at));

    if (requestRows.length === 0) return [];

    const fyIds = [...new Set(requestRows.map((r) => r.financial_year_id))];
    const requestIds = requestRows.map((r) => r.id);

    const [fyRows, itemRows] = await Promise.all([
      db
        .select({ id: financial_years.id, label: financial_years.label })
        .from(financial_years)
        .where(eq(financial_years.tenant_id, tenantId)),
      db
        .select({ request_id: request_items.request_id, status: request_items.status })
        .from(request_items)
        .where(eq(request_items.tenant_id, tenantId)),
    ]);

    const fyMap = new Map(fyRows.map((f) => [f.id, f.label]));

    return requestRows.map((r) => {
      const items = itemRows.filter((i) => i.request_id === r.id);
      return {
        id: r.id,
        title: r.title,
        status: r.status,
        created_at: r.created_at.toISOString(),
        fyLabel: fyMap.get(r.financial_year_id) ?? null,
        request_items: items.map((i) => ({ status: i.status })),
      };
    });
  });
