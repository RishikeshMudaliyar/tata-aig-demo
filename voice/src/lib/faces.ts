/**
 * Who is on screen during a voice call.
 *
 * The face has to match the voice, so gender comes from the name of whoever the agent is
 * playing. A curated list covers everyone in the demo data; the heuristic only matters if
 * someone adds a lead later. Appearance is derived from a hash of the name so the same
 * person always looks the same, across reloads and across sessions.
 */

export type Gender = "female" | "male";

const FEMALE = new Set([
  "neha", "priya", "kavita", "pooja", "meena", "fatima", "arti", "sunita", "anita",
  "shruti", "lakshmi", "meenakshi", "sanjana", "priyanka", "meera", "riya", "deepika",
  "divya", "swati", "rekha", "asha", "geeta", "sneha", "ritu", "nisha", "aarti",
]);

const MALE = new Set([
  "vikram", "rahul", "rajesh", "sanjay", "suresh", "amit", "kiran", "deepak", "arjun",
  "rakesh", "rohan", "sunil", "imran", "akash", "rohit", "harpreet", "ajay", "manoj",
  "vijay", "ravi", "anil", "prakash", "nikhil", "karan", "aditya", "gaurav", "vinod",
]);

export function guessGender(fullName?: string | null): Gender {
  const first = (fullName ?? "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (FEMALE.has(first)) return "female";
  if (MALE.has(first)) return "male";
  // Fallback only — most Indian female given names end in a long vowel.
  return /(a|i|ee)$/.test(first) ? "female" : "male";
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export type Look = {
  gender: Gender;
  skin: string;
  hair: string;
  outfit: string;
  outfitDark: string;
  /** small deterministic variations so two people never look identical */
  hairVariant: 0 | 1 | 2;
};

const SKIN = ["#e8b48c", "#dda57a", "#c98f68", "#b87d57", "#efc39f"];
const HAIR = ["#1c1410", "#241a13", "#2f2018", "#160f0b"];
const OUTFIT_F = [
  ["#8e3b6b", "#6f2c53"],
  ["#1f6f6a", "#155450"],
  ["#9a4423", "#78331a"],
  ["#3b4f8e", "#2c3c6f"],
];
const OUTFIT_M = [
  ["#2c4a7c", "#20375d"],
  ["#3a3f47", "#2a2e34"],
  ["#4a4038", "#372f29"],
  ["#1f5c52", "#16453d"],
];

export function lookFor(name: string, genderOverride?: Gender): Look {
  const h = hash(name || "guest");
  const gender = genderOverride ?? guessGender(name);
  const outfits = gender === "female" ? OUTFIT_F : OUTFIT_M;
  const [outfit, outfitDark] = outfits[h % outfits.length];
  return {
    gender,
    skin: SKIN[(h >> 3) % SKIN.length],
    hair: HAIR[(h >> 5) % HAIR.length],
    outfit,
    outfitDark,
    hairVariant: ((h >> 7) % 3) as 0 | 1 | 2,
  };
}

export function firstName(fullName?: string | null): string {
  return (fullName ?? "").trim().split(/\s+/)[0] || "there";
}
