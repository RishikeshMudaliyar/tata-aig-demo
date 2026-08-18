/**
 * NuPlay voice — web call setup.
 *
 * Three things that are easy to get wrong, all learned the hard way:
 *
 * 1. HOST. `/voice/web/call` lives on `agentx-prod.nurixlabs.tech`, NOT on the `api-in`
 *    widget gateway. Older reference code and the drop-in widget both point at `api-in`,
 *    which answers with a 403 that looks like an auth failure but isn't.
 *
 * 2. AUTH SHAPE. Use `agent_id` + the account-shared gateway key (`x-api-key`). Do NOT send
 *    `channel_connection_id` + the widget key — that path is scoped to the exact origin the
 *    widget key was minted for, so it fails anywhere else (including localhost).
 *
 * 3. THE KEYS ARE DIFFERENT LAYERS. `api-key` is the widget's application identity;
 *    `x-api-key` guards the AWS API Gateway in front of the endpoint. A widget key will
 *    never authorize the gateway. `gateway_api_key: null` on a channel connection is normal
 *    and is not the problem.
 */
const API_BASE = process.env.NURIX_API_BASE ?? "https://agentx-prod.nurixlabs.tech";

export type AgentKind = "COACH" | "QUALIFIER";

export const AGENT_IDS: Record<AgentKind, string> = {
  COACH: process.env.NURIX_COACH_AGENT_ID ?? "a6874aeb-8061-43e7-bb0b-7515dbfa115a",
  QUALIFIER: process.env.NURIX_QUALIFIER_AGENT_ID ?? "fbad08b6-4f3f-48ec-ac6b-056c6ba536fe",
};

/** Account-shared, not per-widget. Server-side only — never NEXT_PUBLIC. */
const gatewayKey = () => process.env.NURIX_GATEWAY_API_KEY ?? "";
export const gatewayKeyConfigured = () => gatewayKey().length > 0;

function uuid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export type WebCall = {
  serverUrl?: string;
  participantToken?: string;
  roomName?: string;
  participantName?: string;
  call_id?: string;
};

export async function startWebCall(kind: AgentKind, variables: Record<string, string> = {}) {
  const userId = uuid();
  const r = await fetch(`${API_BASE}/voice/web/call`, {
    method: "POST",
    cache: "no-store",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "user-id": userId,
      "x-api-key": gatewayKey(),
    },
    body: JSON.stringify({
      agent_id: AGENT_IDS[kind],
      overide_previous_context: true, // sic — the real field name, not a typo
      custom_dynamic_variables_config: variables,
    }),
  });
  const body = (await r.json().catch(() => ({}))) as WebCall & { message?: string };
  return { status: r.status, body, userId };
}

/** Transcript, server-side — the result pipeline the muthoot reference never built. */
export async function callTranscript(callId: string, userId: string) {
  const r = await fetch(`${API_BASE}/voice/web/transcript/${callId}`, {
    method: "GET",
    cache: "no-store",
    headers: { accept: "application/json", "user-id": userId, "x-api-key": gatewayKey() },
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
