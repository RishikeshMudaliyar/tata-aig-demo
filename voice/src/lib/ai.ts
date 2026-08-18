/**
 * AI service. Uses Claude when ANTHROPIC_API_KEY is set; otherwise a deterministic
 * fallback so the demo ALWAYS works offline. Every function is intentionally small
 * and grounded in the case data passed to it.
 */
import Anthropic from "@anthropic-ai/sdk";
import { inr } from "@/lib/domain";

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

async function ask(system: string, user: string, maxTokens = 500): Promise<string | null> {
  if (!KEY) return null;
  try {
    const client = new Anthropic({ apiKey: KEY });
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    const block = res.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text.trim() : null;
  } catch (e) {
    console.error("AI call failed, using fallback:", e);
    return null;
  }
}

export type ReqInput = { type: string; title: string; detail: string; customerName: string; language: string; product: string; sumAssured: number };

/** Plain-language, vernacular-ready explanation an FLS can send the customer. */
export async function draftRequirementText(r: ReqInput): Promise<{ text: string; source: "claude" | "fallback" }> {
  const system =
    "You are an assistant for a Tata AIG insurance sales manager. Write a short, warm, plain-language WhatsApp message the salesperson can forward to a customer to explain ONE underwriting requirement and exactly what to do next. Max 55 words. No jargon. Reassuring tone. Do not invent facts beyond what is given.";
  const user = `Customer: ${r.customerName} (preferred language: ${r.language}). Product: ${r.product}, cover ${inr(r.sumAssured)}. Requirement: ${r.title}. Detail: ${r.detail}. Write the message in English, but if the language is not English or Hindi, add a one-line ${r.language} translation.`;
  const out = await ask(system, user, 400);
  if (out) return { text: out, source: "claude" };
  return { text: fallbackReq(r), source: "fallback" };
}

function fallbackReq(r: ReqInput): string {
  switch (r.type) {
    case "FINANCIAL_ITR":
      return `Hi ${r.customerName.split(" ")[0]}, great news — your ${inr(r.sumAssured)} plan is almost through! For a cover this size the insurer just needs your last 2 years' ITR to confirm income. Could you share them? I'll upload them for you — takes 2 minutes.`;
    case "MEDICAL_TELE_MER":
      return `Hi ${r.customerName.split(" ")[0]}, one quick step left for your policy: a short tele-medical call with a doctor (10 mins, from home). Shall I book a slot for you this week? Nothing to prepare.`;
    case "KYC_MISMATCH":
      return `Hi ${r.customerName.split(" ")[0]}, small fix needed: your name reads slightly differently on PAN vs Aadhaar. Please share whichever one has your correct legal name and I'll align the records. That's the last blocker!`;
    default:
      return `Hi ${r.customerName.split(" ")[0]}, one small requirement is pending on your application: ${r.title}. I'll guide you through it — it won't take long.`;
  }
}

export type SaveInput = { customerName: string; language: string; product: string; premium: number; dueDate: string | null; fundValue: number | null; reasons: string[] };

/** A vernacular save/reminder message for the Lapse Saver flow. */
export async function draftSaveMessage(s: SaveInput): Promise<{ text: string; source: "claude" | "fallback" }> {
  const system =
    "You are an assistant for Tata AIG retention. Write a short, caring renewal-save message (max 55 words) for a customer whose policy is about to lapse. Acknowledge any pending service issue first, then gently remind about the renewal and offer to help pay. No pressure, no jargon.";
  const user = `Customer: ${s.customerName} (language: ${s.language}). Policy: ${s.product}, premium ${inr(s.premium)}, due ${s.dueDate}. Fund value at stake: ${inr(s.fundValue ?? 0)}. Context: ${s.reasons.join("; ")}. English, plus a one-line ${s.language} version if not English/Hindi.`;
  const out = await ask(system, user, 400);
  if (out) return { text: out, source: "claude" };
  const first = s.customerName.split(" ")[0];
  return {
    text: `Hi ${first}, this is Tata AIG. We noticed your fund switch is still pending — sorry about that, I'll get it done today. Also, your ${s.product} renewal of ${inr(s.premium)} is due ${s.dueDate}; your savings of ${inr(s.fundValue ?? 0)} stay invested if we renew. Shall I send a secure pay link?`,
    source: "fallback",
  };
}

/** A talk-track for the advisor before they call. */
export async function draftTalkTrack(s: SaveInput): Promise<{ text: string; source: "claude" | "fallback" }> {
  const system =
    "You coach Tata AIG advisors. Produce a 3-bullet talk-track (each under 18 words) for a retention call: 1) open by resolving their pending issue, 2) the save ask, 3) an objection-handling line. Plain, human.";
  const user = `Customer ${s.customerName}. Policy ${s.product}, premium ${inr(s.premium)}, due ${s.dueDate}. Context: ${s.reasons.join("; ")}.`;
  const out = await ask(system, user, 300);
  if (out) return { text: out, source: "claude" };
  return {
    text: `• Open: "I've cleared your pending fund switch — done today."\n• Ask: "Your ${inr(s.premium)} renewal keeps ${inr(s.fundValue ?? 0)} invested — shall I send a pay link now?"\n• If cost objection: "We can switch to a lower-risk fund and keep you covered — no need to exit."`,
    source: "fallback",
  };
}
