import type { CountryRating, CategoryRatings } from "./types";
import { supabase } from "./lib/supabase";

const STORAGE_KEY = "esc-ratings";

export function getAllRatings(): Record<string, CategoryRatings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getRating(countryCode: string): CategoryRatings | null {
  const all = getAllRatings();
  return all[countryCode] ?? null;
}

export function saveRating(
  rating: CountryRating,
  userId?: string | null,
  semiFinal?: number,
): void {
  const all = getAllRatings();
  all[rating.countryCode] = rating.ratings;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

  if (userId) {
    void Promise.resolve(
      supabase
        .from("ratings")
        .upsert(
          {
            user_id: userId,
            country_code: rating.countryCode,
            semi_final: semiFinal ?? 1,
            musik: rating.ratings.musik,
            performance: rating.ratings.performance,
            kostuem: rating.ratings.kostuem,
            show: rating.ratings.show,
            wow_faktor: rating.ratings.wowFaktor,
            esc_feeling: rating.ratings.escFeeling,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,country_code" },
        ),
    ).catch(() => {});
  }
}

export function deleteRating(countryCode: string, userId?: string | null): void {
  const all = getAllRatings();
  delete all[countryCode];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

  if (userId) {
    void Promise.resolve(
      supabase
        .from("ratings")
        .delete()
        .eq("user_id", userId)
        .eq("country_code", countryCode),
    ).catch(() => {});
  }
}

export function calcAverage(ratings: CategoryRatings): number {
  const vals = Object.values(ratings);
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
