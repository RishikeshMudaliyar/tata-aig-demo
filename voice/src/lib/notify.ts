import { db } from "@/lib/db";

/** Cross-role notification — every hand-off pings the receiving persona. */
export async function notify(personaId: string | null | undefined, text: string, href?: string) {
  if (!personaId) return;
  await db.notification.create({ data: { personaId, text, href: href ?? null } });
}
