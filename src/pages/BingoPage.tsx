import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { saveBingoBoard, insertBingoWin, fetchBingoWins, supabase } from "../lib/supabase";
import type { BingoWin } from "../lib/supabase";
import styles from "./BingoPage.module.css";

type BingoChannel = ReturnType<typeof supabase.channel>;

// ── Ranking helpers ────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

interface UserEntry {
  userId: string;
  username: string;
  count: number;
  types: string[];
  firstAt: string;
}

function buildLeaderboard(wins: BingoWin[]): UserEntry[] {
  const map = new Map<string, UserEntry>();
  for (const w of wins) {
    if (!map.has(w.userId)) {
      map.set(w.userId, { userId: w.userId, username: w.username, count: 0, types: [], firstAt: w.achievedAt });
    }
    const e = map.get(w.userId)!;
    e.count++;
    e.types.push(w.bingoType);
  }
  return Array.from(map.values()).sort(
    (a, b) => b.count - a.count || new Date(a.firstAt).getTime() - new Date(b.firstAt).getTime(),
  );
}

const BINGO_TYPE_ORDER = ["Reihe", "Spalte", "Diagonale"];

function buildTypeMap(wins: BingoWin[]): Map<string, BingoWin[]> {
  const map = new Map<string, BingoWin[]>();
  for (const type of BINGO_TYPE_ORDER) map.set(type, []);
  for (const w of wins) {
    if (!map.has(w.bingoType)) map.set(w.bingoType, []);
    map.get(w.bingoType)!.push(w);
  }
  return map;
}

// ── Ranking tab component ──────────────────────────────────────────────────

interface RankingTabProps {
  wins: BingoWin[];
  onRefresh: () => void;
  currentUserId: string | null;
}

function RankingTab({ wins, onRefresh, currentUserId }: RankingTabProps) {
  const leaderboard = buildLeaderboard(wins);
  const typeMap = buildTypeMap(wins);

  if (wins.length === 0) {
    return (
      <div className={styles.rankEmpty}>
        <p>Noch niemand hat ein Bingo erreicht.</p>
        <p>Markiere Felder im Bingo-Board, um als Erster eingetragen zu werden!</p>
        <button className={styles.refreshBtn} onClick={onRefresh}>↻ Aktualisieren</button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.refreshRow}>
        <span className={styles.rankInfo}>
          {leaderboard.length} {leaderboard.length === 1 ? "Spieler" : "Spieler"} mit Bingo
        </span>
        <button className={styles.refreshBtn} onClick={onRefresh}>↻ Aktualisieren</button>
      </div>

      {/* Section 1: overall leaderboard */}
      <section className={styles.rankSection}>
        <h2 className={styles.rankSectionTitle}>👑 Gesamtrangliste</h2>
        <div className={styles.leaderboard}>
          {leaderboard.map((entry, idx) => {
            const isSelf = entry.userId === currentUserId;
            return (
              <div key={entry.userId} className={`${styles.lbRow} ${isSelf ? styles.lbRowSelf : ""}`}>
                <span className={`${styles.lbRank} ${idx === 0 ? styles.rankGold : idx === 1 ? styles.rankSilver : idx === 2 ? styles.rankBronze : ""}`}>
                  {idx + 1}
                </span>
                <span className={styles.lbUsername}>
                  {entry.username}
                  {isSelf && <span className={styles.lbSelfTag}>du</span>}
                </span>
                <span className={styles.lbTypes}>
                  {entry.types.map((t, i) => (
                    <span key={i} className={styles.typeBadge}>{t}</span>
                  ))}
                </span>
                <span className={styles.lbCount}>★ {entry.count}</span>
                <span className={styles.lbDate}>{formatDate(entry.firstAt)}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2: by type */}
      <section className={styles.rankSection}>
        <h2 className={styles.rankSectionTitle}>📋 Bingo-Typen Übersicht</h2>
        <div className={styles.typeGrid}>
          {Array.from(typeMap.entries()).map(([type, typeWins]) => (
            <div key={type} className={styles.typeCard}>
              <div className={styles.typeCardTitle}>{type}</div>
              {typeWins.length === 0 ? (
                <p className={styles.typeCardEmpty}>Noch niemand</p>
              ) : (
                <ol className={styles.typeList}>
                  {typeWins.map((w, i) => (
                    <li key={w.userId + w.achievedAt} className={`${styles.typeEntry} ${w.userId === currentUserId ? styles.typeEntrySelf : ""}`}>
                      <span className={`${styles.typeRank} ${i === 0 ? styles.rankGold : i === 1 ? styles.rankSilver : i === 2 ? styles.rankBronze : ""}`}>
                        {i + 1}
                      </span>
                      <span className={styles.typeUsername}>{w.username}</span>
                      <span className={styles.typeDate}>{formatDate(w.achievedAt)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

const ESC_TERMS = [
  "Key Change",
  "Windmaschine",
  "Pyro / Feuerwerk",
  "Regenbogen-Flaggen im Publikum",
  "Dramatische Pause vorm Score",
  "Punkte aus Australien",
  "Kleid mit viel Glitzer",
  "Barfuß auf der Bühne",
  "Outfitwechsel im Song",
  "Rap-Part",
  "Ballade mit viel Nebel",
  "Flacher Witz vom Moderator",
  "12 Punkte fürs Nachbarland",
  "Jury vs. Televoting krass unterschiedlich",
  "Künstler:in weint auf der Bühne",
  "LED-Boden auf der Bühne",
  "Publikum singt mit",
  "Hintergrundtänzer mit Accessoires",
  "Flöte oder Dudelsack im Song",
  "Goldene Konfetti",
  "Sprachenwechsel im Song",
  "Chor im Hintergrund",
  "Headset statt Handmikrofon",
  "Neonfarben im Kostüm",
  "Unterwäsche als Outfit",
];

const BINGO_KEY = "esc-bingo";

interface BingoStorage {
  inputText: string;
  board: string[];
  marked: boolean[];
  doShuffle: boolean;
  mode: "setup" | "play";
}

function loadStored(): Partial<BingoStorage> {
  try {
    const raw = localStorage.getItem(BINGO_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Gibt alle vollständig markierten Linien (Zeilen, Spalten, Diagonalen) als Index-Arrays zurück
function detectBingoLines(marked: boolean[]): number[][] {
  const lines: number[][] = [];

  // Zeilen
  for (let r = 0; r < 5; r++) {
    const row = [r * 5, r * 5 + 1, r * 5 + 2, r * 5 + 3, r * 5 + 4];
    if (row.every((i) => marked[i])) lines.push(row);
  }
  // Spalten
  for (let c = 0; c < 5; c++) {
    const col = [c, c + 5, c + 10, c + 15, c + 20];
    if (col.every((i) => marked[i])) lines.push(col);
  }
  // Diagonalen
  const d1 = [0, 6, 12, 18, 24];
  const d2 = [4, 8, 12, 16, 20];
  if (d1.every((i) => marked[i])) lines.push(d1);
  if (d2.every((i) => marked[i])) lines.push(d2);

  return lines;
}

function getBingoType(line: number[]): string {
  const diff = line[1] - line[0];
  if (diff === 1) return "Reihe";
  if (diff === 5) return "Spalte";
  return "Diagonale";
}

export default function BingoPage() {
  const stored = loadStored();
  const navigate = useNavigate();
  const { userId, username } = useUser();

  const [pageTab, setPageTab] = useState<"bingo" | "ranking">("bingo");
  const [rankingWins, setRankingWins] = useState<BingoWin[] | null>(null);
  const [rankingLoading, setRankingLoading] = useState(false);

  const [mode, setMode] = useState<"setup" | "play">(stored.mode ?? "setup");
  const [inputText, setInputText] = useState(stored.inputText ?? "");
  const [board, setBoard] = useState<string[]>(stored.board ?? Array(25).fill(""));
  const [marked, setMarked] = useState<boolean[]>(stored.marked ?? Array(25).fill(false));
  const [doShuffle, setDoShuffle] = useState(stored.doShuffle ?? true);

  const channelRef = useRef<BingoChannel | null>(null);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel("bingo-events").subscribe();
    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId]);

  async function loadRanking() {
    setRankingLoading(true);
    setRankingWins(null);
    try {
      const wins = await fetchBingoWins();
      setRankingWins(wins);
    } finally {
      setRankingLoading(false);
    }
  }

  async function handleRankingTab() {
    setPageTab("ranking");
    if (!rankingWins && !rankingLoading) await loadRanking();
  }

  function persist(patch: Partial<BingoStorage>) {
    const state: BingoStorage = { inputText, board, marked, doShuffle, mode, ...patch };
    localStorage.setItem(BINGO_KEY, JSON.stringify(state));
  }

  function handleFillDefaults() {
    const existing = inputText.split("\n").map((l) => l.trim()).filter(Boolean);
    const needed = 25 - existing.length;
    if (needed <= 0) return;
    const available = ESC_TERMS.filter((t) => !existing.includes(t));
    const newText = [...existing, ...available.slice(0, needed)].join("\n");
    setInputText(newText);
    persist({ inputText: newText });
  }

  // Baut das Board aus den eingegebenen Begriffen (optional gemischt, auf 25 Slots aufgefüllt)
  function handleCreateBoard() {
    const terms = inputText.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 25);
    const padded = [...terms, ...Array(25 - terms.length).fill("")];
    const finalBoard = doShuffle ? shuffleArray(padded) : padded;
    const newMarked = Array(25).fill(false);
    setBoard(finalBoard);
    setMarked(newMarked);
    setMode("play");
    persist({ board: finalBoard, marked: newMarked, mode: "play" });
    if (userId) void saveBingoBoard(userId, finalBoard, newMarked, 0);
  }

  function toggleCell(i: number) {
    if (!board[i]) return;
    const newMarked = [...marked];
    newMarked[i] = !newMarked[i];

    const prevLineStrings = new Set(detectBingoLines(marked).map((l) => l.join(",")));
    const newLines = detectBingoLines(newMarked);
    const newlyCompleted = newLines.filter((l) => !prevLineStrings.has(l.join(",")));

    setMarked(newMarked);
    persist({ marked: newMarked });
    if (userId) void saveBingoBoard(userId, board, newMarked, newLines.length);

    if (newlyCompleted.length > 0 && userId) {
      for (const line of newlyCompleted) {
        void insertBingoWin(userId, getBingoType(line));
      }
    }

    if (newlyCompleted.length > 0 && username && channelRef.current) {
      for (const line of newlyCompleted) {
        void Promise.resolve(
          channelRef.current.send({
            type: "broadcast",
            event: "bingo",
            payload: { username, bingoType: getBingoType(line) },
          })
        ).catch(() => {});
      }
    }
  }

  function handleReset() {
    setMode("setup");
    persist({ mode: "setup" });
  }

  const termCount = inputText.split("\n").filter((l) => l.trim()).length;
  const bingoLines = detectBingoLines(marked);
  const bingoIndices = new Set(bingoLines.flat());
  const hasBingo = bingoLines.length > 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span className={styles.logoStar}>★</span>
            <div>
              <h1 className={styles.title}>Eurovision</h1>
              <p className={styles.subtitle}>ESC 2026 – Bingo</p>
            </div>
          </div>
          <button className={styles.backBtn} onClick={() => navigate("/")}>
            ← Wertung
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {/* Page-level tabs */}
        <div className={styles.pageTabs}>
          <button
            className={pageTab === "bingo" ? styles.pageTabActive : styles.pageTab}
            onClick={() => setPageTab("bingo")}
          >
            🎯 Bingo
          </button>
          <button
            className={pageTab === "ranking" ? styles.pageTabActive : styles.pageTab}
            onClick={handleRankingTab}
          >
            🏆 Bingo-Rangliste
          </button>
        </div>

        {/* Ranking tab */}
        {pageTab === "ranking" && (
          rankingLoading || !rankingWins ? (
            <div className={styles.loadingBox}>
              <div className={styles.spinner} />
              <p className={styles.loadingText}>Lade Rangliste…</p>
            </div>
          ) : (
            <RankingTab wins={rankingWins} onRefresh={loadRanking} currentUserId={userId} />
          )
        )}

        {/* Bingo tab */}
        {pageTab === "bingo" && (mode === "setup" ? (
          <div className={styles.setup}>
            <h2 className={styles.setupTitle}>Bingo-Board konfigurieren</h2>
            <p className={styles.setupHint}>Gib bis zu 25 Begriffe ein – ein Begriff pro Zeile.</p>

            <textarea
              className={styles.textarea}
              placeholder={"Key Change\nWindmaschine\nPyro / Feuerwerk\n..."}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                persist({ inputText: e.target.value });
              }}
              rows={14}
            />

            <div className={styles.termCount}>
              {termCount} / 25 Begriffe
            </div>

            <label className={styles.shuffleLabel}>
              <input
                type="checkbox"
                checked={doShuffle}
                onChange={(e) => {
                  setDoShuffle(e.target.checked);
                  persist({ doShuffle: e.target.checked });
                }}
                className={styles.checkbox}
              />
              Begriffe zufällig mischen
            </label>

            <div className={styles.btnRow}>
              <button className={styles.fillBtn} onClick={handleFillDefaults}>
                Mit ESC-Standard-Begriffen füllen
              </button>
              <button
                className={styles.createBtn}
                onClick={handleCreateBoard}
                disabled={termCount === 0}
              >
                Bingo-Board erstellen →
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.play}>
            {hasBingo && (
              <div className={styles.bingoAlert}>
                🎉 BINGO!{bingoLines.length > 1 ? ` ${bingoLines.length}× Bingo erreicht!` : " Bingo erreicht!"}
              </div>
            )}

            {/* 5×5-Gitter */}
            <div className={styles.grid}>
              {board.map((term, i) => {
                const isMarked = marked[i];
                const isBingoCell = bingoIndices.has(i);
                const isEmpty = !term;
                return (
                  <button
                    key={i}
                    className={[
                      styles.cell,
                      isMarked ? styles.cellMarked : "",
                      isBingoCell ? styles.cellBingo : "",
                      isEmpty ? styles.cellEmpty : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => toggleCell(i)}
                    disabled={isEmpty}
                  >
                    {isMarked && !isEmpty && <span className={styles.checkIcon}>✓</span>}
                    <span className={styles.cellText}>{term}</span>
                  </button>
                );
              })}
            </div>

            <button className={styles.resetBtn} onClick={handleReset}>
              ← Board neu konfigurieren
            </button>
          </div>
        ))}
      </main>
    </div>
  );
}
