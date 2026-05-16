import { createClient } from "@supabase/supabase-js";
import { CONTESTANTS } from "../data/contestants";
import type { CategoryRatings } from "../types";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) ?? "";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Global rating types ────────────────────────────────────────────────────

export interface GlobalCountryRating {
  code: string;
  name: string;
  avgTotal: number;
  avgPerCategory: CategoryRatings;
  count: number;
}

export interface UserRating {
  userId: string;
  username: string;
  ratings: Record<string, CategoryRatings>;
}

export interface GlobalData {
  byCountry: GlobalCountryRating[];
  byUser: UserRating[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function mean(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

type RatingRow = {
  user_id: string;
  country_code: string;
  musik: number | null;
  performance: number | null;
  kostuem: number | null;
  show: number | null;
  wow_faktor: number | null;
  esc_feeling: number | null;
  users: { username: string } | null;
};

const competitors = CONTESTANTS;

// ── Fetch ──────────────────────────────────────────────────────────────────

export async function fetchGlobalRatings(): Promise<GlobalData> {
  const { data, error } = await supabase
    .from("ratings")
    .select("*, users(username)");

  if (error || !data) return { byCountry: [], byUser: [] };

  const rows = data as unknown as RatingRow[];

  type Bucket = { m: number[]; p: number[]; k: number[]; s: number[]; w: number[]; e: number[] };
  const countryBuckets = new Map<string, Bucket>();
  const userBuckets = new Map<string, { username: string; ratings: Record<string, CategoryRatings> }>();

  for (const r of rows) {
    if (
      r.musik == null || r.performance == null || r.kostuem == null ||
      r.show == null || r.wow_faktor == null || r.esc_feeling == null
    ) continue;

    const code = r.country_code;
    const uid = r.user_id;
    const username = r.users?.username ?? uid;

    if (!countryBuckets.has(code)) {
      countryBuckets.set(code, { m: [], p: [], k: [], s: [], w: [], e: [] });
    }
    const b = countryBuckets.get(code)!;
    b.m.push(r.musik);
    b.p.push(r.performance);
    b.k.push(r.kostuem);
    b.s.push(r.show);
    b.w.push(r.wow_faktor);
    b.e.push(r.esc_feeling);

    if (!userBuckets.has(uid)) userBuckets.set(uid, { username, ratings: {} });
    userBuckets.get(uid)!.ratings[code] = {
      musik: r.musik,
      performance: r.performance,
      kostuem: r.kostuem,
      show: r.show,
      wowFaktor: r.wow_faktor,
      escFeeling: r.esc_feeling,
    };
  }

  const byCountry: GlobalCountryRating[] = competitors.map((c) => {
    const b = countryBuckets.get(c.countryCode);
    if (!b || b.m.length === 0) {
      return {
        code: c.countryCode,
        name: c.country,
        avgTotal: 0,
        avgPerCategory: { musik: 0, performance: 0, kostuem: 0, show: 0, wowFaktor: 0, escFeeling: 0 },
        count: 0,
      };
    }
    const avgPerCategory: CategoryRatings = {
      musik: mean(b.m),
      performance: mean(b.p),
      kostuem: mean(b.k),
      show: mean(b.s),
      wowFaktor: mean(b.w),
      escFeeling: mean(b.e),
    };
    return {
      code: c.countryCode,
      name: c.country,
      avgTotal: mean(Object.values(avgPerCategory)),
      avgPerCategory,
      count: b.m.length,
    };
  });

  byCountry.sort((a, b) => {
    if (a.count === 0 && b.count === 0) return a.name.localeCompare(b.name);
    if (a.count === 0) return 1;
    if (b.count === 0) return -1;
    return b.avgTotal - a.avgTotal;
  });

  const byUser: UserRating[] = Array.from(userBuckets.entries()).map(
    ([userId, { username, ratings }]) => ({ userId, username, ratings }),
  );

  return { byCountry, byUser };
}
