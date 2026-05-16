import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { CONTESTANTS } from "../data/contestants";

interface RatingRow {
  user_id: string;
  country_code: string;
  musik: number | null;
  performance: number | null;
  kostuem: number | null;
  show: number | null;
  wow_faktor: number | null;
  esc_feeling: number | null;
}

export interface NotificationData {
  countryCode: string;
  countryName: string;
  username: string;
  avg: number;
}

export function useRatingNotifications(
  userId: string | null,
  onNotification: (data: NotificationData) => void,
) {
  const usernameCache = useRef<Record<string, string>>({});
  const callbackRef = useRef(onNotification);
  callbackRef.current = onNotification;

  useEffect(() => {
    if (!userId) return;

    let unmounted = false;

    async function handleRow(row: RatingRow) {
      // Eigene Events ignorieren
      if (row.user_id === userId) return;

      // Nur vollständige Bewertungen verarbeiten
      if (
        row.musik == null ||
        row.performance == null ||
        row.kostuem == null ||
        row.show == null ||
        row.wow_faktor == null ||
        row.esc_feeling == null
      ) return;

      const avg =
        (row.musik + row.performance + row.kostuem +
         row.show + row.wow_faktor + row.esc_feeling) / 6;

      const contestant = CONTESTANTS.find(
        (c) => c.countryCode === row.country_code,
      );
      if (!contestant) return;

      // Username aus Cache oder Supabase laden
      let username = usernameCache.current[row.user_id];
      if (!username) {
        try {
          const { data } = await supabase
            .from("users")
            .select("username")
            .eq("id", row.user_id)
            .single();
          username = (data?.username as string | undefined) ?? "Unbekannt";
          usernameCache.current[row.user_id] = username;
        } catch {
          username = "Unbekannt";
        }
      }

      if (unmounted) return;

      callbackRef.current({
        countryCode: row.country_code,
        countryName: contestant.country,
        username,
        avg,
      });
    }

    const channel = supabase
      .channel("ratings-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ratings" },
        (payload) => { void handleRow(payload.new as RatingRow); },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ratings" },
        (payload) => { void handleRow(payload.new as RatingRow); },
      )
      .subscribe();

    return () => {
      unmounted = true;
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
