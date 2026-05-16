import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CONTESTANTS } from "../data/contestants";
import { CATEGORIES } from "../types";
import type { CategoryRatings } from "../types";
import { getAllRatings, calcAverage } from "../storage";
import { useUser } from "../context/UserContext";
import { fetchGlobalRatings, fetchBingoRanking } from "../lib/supabase";
import type { GlobalData, GlobalCountryRating, BingoRankingEntry } from "../lib/supabase";
import styles from "./ResultsPage.module.css";

const competitors = CONTESTANTS;

interface RankedCountry {
  name: string;
  code: string;
  ratings: CategoryRatings;
  avg: number;
}

// ── Shared: Podium ─────────────────────────────────────────────────────────

interface PodiumEntry { name: string; code: string; avg: number }
interface PodiumProps { gold: PodiumEntry; silver?: PodiumEntry; bronze?: PodiumEntry }

function PodiumDisplay({ gold, silver, bronze }: PodiumProps) {
  return (
    <div className={styles.podium}>
      {silver && (
        <div className={`${styles.podiumSlot} ${styles.silver}`}>
          <span className={`${styles.podiumRank} ${styles.rankSilver}`}>2</span>
          <img src={`https://flagcdn.com/w160/${silver.code.toLowerCase()}.png`} alt={silver.name} className={styles.podiumFlag} />
          <div className={styles.podiumName}>{silver.name}</div>
          <div className={styles.podiumScore}>★ {silver.avg.toFixed(2)}</div>
          <div className={styles.podiumBar} style={{ height: 80 }} />
        </div>
      )}
      <div className={`${styles.podiumSlot} ${styles.gold}`}>
        <span className={`${styles.podiumRank} ${styles.rankGold}`}>1</span>
        <img src={`https://flagcdn.com/w160/${gold.code.toLowerCase()}.png`} alt={gold.name} className={styles.podiumFlag} />
        <div className={styles.podiumName}>{gold.name}</div>
        <div className={styles.podiumScore}>★ {gold.avg.toFixed(2)}</div>
        <div className={styles.podiumBar} style={{ height: 120 }} />
      </div>
      {bronze && (
        <div className={`${styles.podiumSlot} ${styles.bronze}`}>
          <span className={`${styles.podiumRank} ${styles.rankBronze}`}>3</span>
          <img src={`https://flagcdn.com/w160/${bronze.code.toLowerCase()}.png`} alt={bronze.name} className={styles.podiumFlag} />
          <div className={styles.podiumName}>{bronze.name}</div>
          <div className={styles.podiumScore}>★ {bronze.avg.toFixed(2)}</div>
          <div className={styles.podiumBar} style={{ height: 60 }} />
        </div>
      )}
    </div>
  );
}

// ── Shared: rank list ──────────────────────────────────────────────────────

function RankList({ ranked }: { ranked: RankedCountry[] }) {
  return (
    <div className={styles.rankList}>
      {ranked.map((country, idx) => (
        <div
          key={country.code}
          className={styles.rankRow}
        >
          <span className={`${styles.rankNum} ${idx === 0 ? styles.rankGold : idx === 1 ? styles.rankSilver : idx === 2 ? styles.rankBronze : ""}`}>
            {idx + 1}
          </span>
          <img src={`https://flagcdn.com/w160/${country.code.toLowerCase()}.png`} alt={country.name} className={styles.rankFlag} />
          <span className={styles.rankName}>{country.name}</span>
          <div className={styles.rankBar}>
            <div className={styles.rankBarFill} style={{ width: `${(country.avg / 5) * 100}%` }} />
          </div>
          <span className={styles.rankScore}>★ {country.avg.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Shared: category cards ─────────────────────────────────────────────────

function PersonalCatCards({ ranked }: { ranked: RankedCountry[] }) {
  return (
    <div className={styles.catGrid}>
      {CATEGORIES.map((cat) => {
        const top3 = [...ranked].sort((a, b) => b.ratings[cat.key] - a.ratings[cat.key]).slice(0, 3);
        return (
          <div key={cat.key} className={styles.catCard}>
            <div className={styles.catCardTitle}>{cat.label}</div>
            <ol className={styles.catList}>
              {top3.map((c, i) => (
                <li key={c.code} className={styles.catItem}>
                  <span className={`${styles.catRank} ${i === 0 ? styles.rankGold : i === 1 ? styles.rankSilver : styles.rankBronze}`}>{i + 1}</span>
                  <img src={`https://flagcdn.com/w80/${c.code.toLowerCase()}.png`} alt={c.name} className={styles.catFlag} />
                  <span className={styles.catName}>{c.name}</span>
                  <span className={styles.catScore}>{c.ratings[cat.key]}/5</span>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

// ── Heatmap helper ────────────────────────────────────────────────────────

function heatmapColor(score: number): { bg: string; fg: string } {
  if (score >= 4.5) return { bg: "#FFD700", fg: "#1a1030" };
  if (score >= 3.5) return { bg: "#22c55e", fg: "#1a1030" };
  if (score >= 2.5) return { bg: "#eab308", fg: "#1a1030" };
  if (score >= 1.5) return { bg: "#f97316", fg: "#fff" };
  return { bg: "#ef4444", fg: "#fff" };
}

// ── Rating matrix ──────────────────────────────────────────────────────────

function RatingMatrix({ data }: { data: GlobalData }) {
  if (data.byUser.length === 0 || data.byCountry.every((c) => c.count === 0)) {
    return <p className={styles.noData}>Noch keine Bewertungen vorhanden.</p>;
  }

  return (
    <div className={styles.matrixWrap}>
      <table className={styles.matrixTable}>
        <thead>
          <tr>
            <th className={styles.matrixCorner}>Land</th>
            {data.byUser.map((u) => (
              <th key={u.userId} className={styles.matrixUserHead}>
                {u.username}
              </th>
            ))}
            <th className={styles.matrixTotalHead}>Ø Gesamt</th>
          </tr>
        </thead>
        <tbody>
          {data.byCountry.map((c) => {
            const hasAny = c.count > 0;
            return (
              <tr key={c.code} className={hasAny ? "" : styles.matrixRowDim}>
                <td className={styles.matrixCountryCell}>
                  <img
                    src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
                    alt={c.name}
                    className={styles.matrixFlag}
                  />
                  <span className={styles.matrixCountryName}>{c.name}</span>
                </td>
                {data.byUser.map((u) => {
                  const r = u.ratings[c.code];
                  if (!r) {
                    return (
                      <td key={u.userId} className={styles.matrixCell}>
                        <span className={styles.matrixEmpty}>—</span>
                      </td>
                    );
                  }
                  const avg = calcAverage(r);
                  const { bg, fg } = heatmapColor(avg);
                  const tip = CATEGORIES
                    .map((cat) => `${cat.emoji} ${cat.label}: ${r[cat.key]}`)
                    .join("\n");
                  return (
                    <td
                      key={u.userId}
                      className={styles.matrixCell}
                      style={{ background: bg, color: fg }}
                      title={tip}
                    >
                      {avg.toFixed(1)}
                    </td>
                  );
                })}
                <td
                  className={styles.matrixTotalCell}
                  style={hasAny ? { background: heatmapColor(c.avgTotal).bg, color: heatmapColor(c.avgTotal).fg } : undefined}
                >
                  {hasAny ? <strong>{c.avgTotal.toFixed(1)}</strong> : <span className={styles.matrixEmpty}>—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Global tab ─────────────────────────────────────────────────────────────

interface GlobalTabProps {
  data: GlobalData;
  onRefresh: () => void;
  currentUsername: string | null;
}

function GlobalTab({ data, onRefresh, currentUsername }: GlobalTabProps) {
  const ownUserId = data.byUser.find((u) => u.username === currentUsername)?.userId;
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    ownUserId ?? data.byUser[0]?.userId ?? null,
  );

  const ratedCountries = data.byCountry.filter((c) => c.count > 0);
  const [gold, silver, bronze] = ratedCountries;

  const selectedUser = data.byUser.find((u) => u.userId === selectedUserId);
  const userRanked: RankedCountry[] = selectedUser
    ? competitors
        .filter((c) => selectedUser.ratings[c.countryCode])
        .map((c) => ({
          name: c.country,
          code: c.countryCode,
          ratings: selectedUser.ratings[c.countryCode],
          avg: calcAverage(selectedUser.ratings[c.countryCode]),
        }))
        .sort((a, b) => b.avg - a.avg)
    : [];

  return (
    <>
      {/* Info + refresh */}
      <div className={styles.refreshRow}>
        <span className={styles.dataInfo}>
          {data.byUser.length} {data.byUser.length === 1 ? "Nutzer" : "Nutzer"} · {ratedCountries.length} bewertete Länder
        </span>
        <button className={styles.refreshBtn} onClick={onRefresh}>↻ Aktualisieren</button>
      </div>

      {/* Global podium */}
      {ratedCountries.length >= 1 && (
        <section className={styles.podiumSection}>
          <h2 className={styles.sectionTitle}>Globales Podium</h2>
          <PodiumDisplay
            gold={{ name: gold.name, code: gold.code, avg: gold.avgTotal }}
            silver={silver ? { name: silver.name, code: silver.code, avg: silver.avgTotal } : undefined}
            bronze={bronze ? { name: bronze.name, code: bronze.code, avg: bronze.avgTotal } : undefined}
          />
        </section>
      )}

      {/* Global rank table */}
      <section className={styles.rankingSection}>
        <h2 className={styles.sectionTitle}>Gesamtranking</h2>
        <div className={styles.tableWrap}>
          <table className={styles.globalTable}>
            <thead>
              <tr>
                <th className={styles.thRank}>#</th>
                <th></th>
                <th className={styles.thName}>Land</th>
                <th className={styles.thAvg}>Ø</th>
                {CATEGORIES.map((c) => (
                  <th key={c.key} className={styles.thCat} title={c.label}>{c.emoji}</th>
                ))}
                <th className={styles.thCount}>Stimmen</th>
              </tr>
            </thead>
            <tbody>
              {data.byCountry.map((c, i) => (
                <GlobalTableRow key={c.code} c={c} rank={i} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Rating matrix */}
      {data.byUser.length > 0 && (
        <section className={styles.rankingSection}>
          <h2 className={styles.sectionTitle}>Bewertungsmatrix</h2>
          <RatingMatrix data={data} />
        </section>
      )}

      {/* Per-user ranking */}
      {data.byUser.length > 0 && (
        <section className={styles.rankingSection}>
          <h2 className={styles.sectionTitle}>Ranking pro Nutzer</h2>
          <div className={styles.userSelectorRow}>
            <label className={styles.userSelectorLabel} htmlFor="user-select">Nutzer:</label>
            <select
              id="user-select"
              className={styles.userSelect}
              value={selectedUserId ?? ""}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              {data.byUser.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.username}{u.username === currentUsername ? " (du)" : ""}
                </option>
              ))}
            </select>
          </div>
          {userRanked.length === 0 ? (
            <p className={styles.noData}>Dieser Nutzer hat noch keine Länder bewertet.</p>
          ) : (
            <RankList ranked={userRanked} />
          )}
        </section>
      )}

      {/* Category comparison */}
      {ratedCountries.length > 0 && (
        <section className={styles.catSection}>
          <h2 className={styles.sectionTitle}>Kategorie-Vergleich</h2>
          <div className={styles.catGrid}>
            {CATEGORIES.map((cat) => {
              const top3 = [...ratedCountries]
                .sort((a, b) => b.avgPerCategory[cat.key] - a.avgPerCategory[cat.key])
                .slice(0, 3);
              return (
                <div key={cat.key} className={styles.catCard}>
                  <div className={styles.catCardTitle}>{cat.label}</div>
                  <ol className={styles.catList}>
                    {top3.map((c, i) => (
                      <li key={c.code} className={styles.catItem}>
                        <span className={`${styles.catRank} ${i === 0 ? styles.rankGold : i === 1 ? styles.rankSilver : styles.rankBronze}`}>{i + 1}</span>
                        <img src={`https://flagcdn.com/w80/${c.code.toLowerCase()}.png`} alt={c.name} className={styles.catFlag} />
                        <span className={styles.catName}>{c.name}</span>
                        <span className={styles.catScore}>{c.avgPerCategory[cat.key].toFixed(2)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

// ── Bingo tab ──────────────────────────────────────────────────────────────

interface BingoTabProps {
  data: BingoRankingEntry[];
  onRefresh: () => void;
  currentUserId: string | null;
}

function BingoTab({ data, onRefresh, currentUserId }: BingoTabProps) {
  if (data.length === 0) {
    return (
      <div className={styles.bingoEmpty}>
        <p>Noch niemand hat ein Bingo erreicht.</p>
        <p>Spiel Bingo während des Grand Finals!</p>
        <button className={styles.refreshBtn} onClick={onRefresh}>↻ Aktualisieren</button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.refreshRow}>
        <span className={styles.dataInfo}>
          {data.length} {data.length === 1 ? "Spieler" : "Spieler"} mit Bingo
        </span>
        <button className={styles.refreshBtn} onClick={onRefresh}>↻ Aktualisieren</button>
      </div>

      <div className={styles.bingoList}>
        {data.map((entry, idx) => {
          const isSelf = entry.userId === currentUserId;
          return (
            <div
              key={entry.userId}
              className={`${styles.bingoRow} ${isSelf ? styles.bingoRowSelf : ""}`}
            >
              <span className={`${styles.rankNum} ${idx === 0 ? styles.rankGold : idx === 1 ? styles.rankSilver : idx === 2 ? styles.rankBronze : ""}`}>
                {idx + 1}
              </span>
              <span className={styles.bingoUsername}>
                {entry.username}
                {isSelf && <span className={styles.bingoSelfLabel}>(du)</span>}
              </span>
              <span className={styles.bingoBadge}>
                ★ {entry.bingoCount}× Bingo
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function GlobalTableRow({ c, rank }: { c: GlobalCountryRating; rank: number }) {
  const hasRating = c.count > 0;
  const rankLabel = hasRating ? `${rank + 1}` : "—";
  return (
    <tr className={`${hasRating ? "" : styles.dimmed} ${hasRating && rank < 3 ? styles[["rowGold","rowSilver","rowBronze"][rank]] : ""}`}>
      <td className={`${styles.tdRank} ${hasRating && rank < 3 ? styles[["rankGold","rankSilver","rankBronze"][rank]] : ""}`}>{rankLabel}</td>
      <td>
        <img
          src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
          alt={c.name}
          className={styles.tableFlag}
        />
      </td>
      <td className={styles.tdName}>{c.name}</td>
      <td className={styles.tdAvg}>{hasRating ? <strong>{c.avgTotal.toFixed(2)}</strong> : "—"}</td>
      {CATEGORIES.map((cat) => (
        <td key={cat.key} className={styles.tdCat}>
          {hasRating ? c.avgPerCategory[cat.key].toFixed(1) : "—"}
        </td>
      ))}
      <td className={styles.tdCount}>
        {hasRating ? <span className={styles.countBadge}>{c.count}</span> : <span className={styles.dimText}>0</span>}
      </td>
    </tr>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ResultsPage() {
  const navigate = useNavigate();
  const { username, userId, logout } = useUser();
  const allRatings = getAllRatings();

  const [tab, setTab] = useState<"mine" | "global" | "bingo">("mine");
  const [globalData, setGlobalData] = useState<GlobalData | null>(null);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [bingoData, setBingoData] = useState<BingoRankingEntry[] | null>(null);
  const [bingoLoading, setBingoLoading] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  async function loadGlobalData() {
    setGlobalLoading(true);
    setGlobalData(null);
    try {
      const data = await fetchGlobalRatings();
      setGlobalData(data);
    } finally {
      setGlobalLoading(false);
    }
  }

  async function handleGlobalTab() {
    setTab("global");
    if (!globalData && !globalLoading) {
      await loadGlobalData();
    }
  }

  async function loadBingoData() {
    setBingoLoading(true);
    setBingoData(null);
    try {
      const data = await fetchBingoRanking();
      setBingoData(data);
    } finally {
      setBingoLoading(false);
    }
  }

  async function handleBingoTab() {
    setTab("bingo");
    if (!bingoData && !bingoLoading) {
      await loadBingoData();
    }
  }

  const ranked: RankedCountry[] = competitors
    .filter((c) => allRatings[c.countryCode])
    .map((c) => ({
      name: c.country,
      code: c.countryCode,
      ratings: allRatings[c.countryCode],
      avg: calcAverage(allRatings[c.countryCode]),
    }))
    .sort((a, b) => b.avg - a.avg);

  const [gold, silver, bronze] = ranked;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* User bar */}
        {username && (
          <div className={styles.userBar}>
            <span className={styles.userBarText}>Eingeloggt als <strong>{username}</strong></span>
            <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
          </div>
        )}

        <button className={styles.backLink} onClick={() => navigate("/")}>← Zurück</button>

        <h1 className={styles.pageTitle}>Auswertung</h1>

        {/* Tab bar */}
        <div className={styles.tabs}>
          <button
            className={tab === "mine" ? styles.tabActive : styles.tab}
            onClick={() => setTab("mine")}
          >
            Mein Ranking
          </button>
          <button
            className={tab === "global" ? styles.tabActive : styles.tab}
            onClick={handleGlobalTab}
          >
            Globales Ranking
          </button>
          <button
            className={tab === "bingo" ? styles.tabActive : styles.tab}
            onClick={handleBingoTab}
          >
            Bingo-Ranking
          </button>
        </div>

        {/* ── Mine tab ── */}
        {tab === "mine" && (
          ranked.length === 0 ? (
            <div className={styles.emptyTab}>
                  <h2>Noch keine Bewertungen</h2>
              <p>Bewerte zuerst einige Länder, um die Auswertung zu sehen.</p>
              <button className={styles.backBtn} onClick={() => navigate("/")}>← Zur Startseite</button>
            </div>
          ) : (
            <>
              <section className={styles.podiumSection}>
                <h2 className={styles.sectionTitle}>Podium</h2>
                <PodiumDisplay
                  gold={{ name: gold.name, code: gold.code, avg: gold.avg }}
                  silver={silver ? { name: silver.name, code: silver.code, avg: silver.avg } : undefined}
                  bronze={bronze ? { name: bronze.name, code: bronze.code, avg: bronze.avg } : undefined}
                />
              </section>

              <section className={styles.rankingSection}>
                <h2 className={styles.sectionTitle}>Gesamtranking</h2>
                <RankList ranked={ranked} />
              </section>

              <section className={styles.catSection}>
                <h2 className={styles.sectionTitle}>Kategorie-Rankings</h2>
                <PersonalCatCards ranked={ranked} />
              </section>
            </>
          )
        )}

        {/* ── Global tab ── */}
        {tab === "global" && (
          globalLoading || !globalData ? (
            <div className={styles.loadingBox}>
              <div className={styles.spinner} />
              <p className={styles.loadingText}>Lade globale Daten…</p>
            </div>
          ) : (
            <GlobalTab
              data={globalData}
              onRefresh={loadGlobalData}
              currentUsername={username}
            />
          )
        )}

        {/* ── Bingo tab ── */}
        {tab === "bingo" && (
          bingoLoading || !bingoData ? (
            <div className={styles.loadingBox}>
              <div className={styles.spinner} />
              <p className={styles.loadingText}>Lade Bingo-Ranking…</p>
            </div>
          ) : (
            <section className={styles.rankingSection}>
              <h2 className={styles.sectionTitle}>Bingo-Ranking</h2>
              <BingoTab
                data={bingoData}
                onRefresh={loadBingoData}
                currentUserId={userId}
              />
            </section>
          )
        )}
      </div>
    </div>
  );
}
