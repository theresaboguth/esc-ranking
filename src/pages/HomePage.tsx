import { useNavigate } from "react-router-dom";
import { CONTESTANTS } from "../data/contestants";
import type { Contestant } from "../data/contestants";
import { getAllRatings, calcAverage } from "../storage";
import styles from "./HomePage.module.css";

function getArtistImageUrl(c: Contestant): string | null {
  if (c.pressImageUrl) return c.pressImageUrl;
  const cached = localStorage.getItem(`wiki_img_v2_${c.countryCode}`);
  return cached && cached !== "NONE" ? cached : null;
}

export default function HomePage() {
  const navigate = useNavigate();
  const ratings = getAllRatings();

  const ratedCount = CONTESTANTS.filter((c) => ratings[c.countryCode]).length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <div>
              <h1 className={styles.title}>Eurovision</h1>
              <p className={styles.subtitle}>ESC 2026 – Grand Final</p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <span className={styles.progress}>
              {ratedCount}/{CONTESTANTS.length} bewertet
            </span>
            <button
              className={styles.bingoBtn}
              onClick={() => navigate("/bingo")}
            >
              Bingo
            </button>
            <button
              className={styles.resultsBtn}
              onClick={() => navigate("/results")}
              disabled={Object.keys(ratings).length === 0}
            >
              Auswertung
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.grid}>
          {CONTESTANTS.map((c) => {
            const rating = ratings[c.countryCode];
            const avg = rating ? calcAverage(rating) : null;
            const isRated = rating != null;
            const artistImageUrl = getArtistImageUrl(c);

            return (
              <button
                key={c.countryCode}
                className={`${styles.cardOuter} ${
                  isRated ? styles.ratedOuter : styles.unratedOuter
                }`}
                onClick={() => navigate(`/rate/${c.countryCode}`)}
              >
                <div className={styles.cardInner}>
                  {/* Front face */}
                  <div className={styles.cardFront}>
                    <div className={styles.flagWrap}>
                      <img
                        src={`https://flagcdn.com/w320/${c.countryCode.toLowerCase()}.png`}
                        alt={`Flagge ${c.country}`}
                        className={styles.flag}
                      />
                      <span className={styles.runOrder}>{c.runningOrder}</span>
                      {isRated && (
                        <span className={styles.checkmark}>✓</span>
                      )}
                    </div>
                    <div className={styles.cardBody}>
                      <span className={styles.countryName}>{c.country}</span>
                      <span className={styles.artistName}>{c.artist}</span>
                      {isRated && avg !== null ? (
                        <span className={styles.avgScore}>
                          <span className={styles.avgStar}>★</span>
                          {avg.toFixed(1)}
                        </span>
                      ) : (
                        <span className={styles.notRated}>
                          Noch nicht bewertet
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Back face */}
                  <div className={styles.cardBack}>
                    {artistImageUrl ? (
                      <img
                        src={artistImageUrl}
                        alt={c.artist}
                        className={styles.backImg}
                      />
                    ) : (
                      <div className={styles.backFallback}>
                        <span className={styles.backMic}>🎤</span>
                        <span className={styles.backArtistName}>{c.artist}</span>
                      </div>
                    )}
                    <div className={styles.backOverlay}>
                      <span className={styles.backCountry}>{c.country}</span>
                      {isRated && avg !== null && (
                        <span className={styles.backScore}>★ {avg.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
