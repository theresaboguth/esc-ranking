import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

interface BingoPayload {
  username: string;
  bingoType: string;
}

export interface BingoNotificationData {
  bingoUsername: string;
  bingoType: string;
}

export function useBingoNotifications(
  username: string | null,
  onBingo: (data: BingoNotificationData) => void,
) {
  const usernameRef = useRef(username);
  usernameRef.current = username;
  const callbackRef = useRef(onBingo);
  callbackRef.current = onBingo;

  useEffect(() => {
    const channel = supabase
      .channel("bingo-events")
      .on("broadcast", { event: "bingo" }, (payload) => {
        const { username: bingoUsername, bingoType } = payload.payload as BingoPayload;
        if (bingoUsername === usernameRef.current) return;
        callbackRef.current({ bingoUsername, bingoType });
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, []);
}
