import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CONTESTANTS } from "../data/contestants";
import { CATEGORIES } from "../types";
import type { CategoryRatings } from "../types";
import { getRating, saveRating, deleteRating } from "../storage";
import { useUser } from "../context/UserContext";
import StarRating from "../components/StarRating";
import styles from "./RatingPage.module.css";

const EMPTY: CategoryRatings = {
  musik: 0,
  performance: 0,
  kostuem: 0,
  show: 0,
  wowFaktor: 0,
  escFeeling: 0,
};

function useArtistImage(
  slug: string,
  countryCode: string,
  pressImageUrl?: string,
  escPressImageUrl?: string,
) {
  // v2 key — only caches the Wikipedia result (URL or "NONE")
  const cacheKey = `wiki_img_v2_${countryCode}`;

  const [wikiUrl, setWikiUrl] = useState<string | null>(() => {
    if (pressImageUrl || !countryCode) return null;
    const cached = localStorage.getItem(cacheKey);
    return cached && cached !== "NONE" ? cached : null;
  });
  const [loading, setLoading] = useState(() => {
    if (pressImageUrl || !countryCode) return false;
    return localStorage.getItem(cacheKey) === null;
  });

  useEffect(() => {
    if (pressImageUrl || !countryCode) { setLoading(false); return; }

    const cached = localStorage.getItem(cacheKey);
    if (cached !== null) {
      setWikiUrl(cached !== "NONE" ? cached : null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function load() {
      let url: string | null = null;
      if (slug) {
        try {
          const r = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`,
          );
          const data = await r.json() as { thumbnail?: { source: string } };
          url = data?.thumbnail?.source ?? null;
        } catch { /* fall through */ }
      }
      if (!cancelled) {
        localStorage.setItem(cacheKey, url ?? "NONE");
        setWikiUrl(url);
        setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [slug, cacheKey, pressImageUrl, countryCode]);

  // Priority: explicit press photo > Wikipedia thumbnail > ESCplus (rendered directly)
  const imageUrl = pressImageUrl ?? (loading ? null : (wikiUrl ?? escPressImageUrl ?? null));

  return { imageUrl, loading };
}

export default function RatingPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { userId } = useUser();
  const contestant = CONTESTANTS.find((c) => c.countryCode === code);

  const { imageUrl: heroImageUrl, loading: heroLoading } = useArtistImage(
    contestant?.wikipediaSlug ?? "",
    contestant?.countryCode ?? "",
    contestant?.pressImageUrl,
    contestant?.escPressImageUrl,
  );

  // Reset when navigating to a different country
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  useEffect(() => { setHeroImgFailed(false); }, [heroImageUrl]);

  const [ratings, setRatings] = useState<CategoryRatings>(EMPTY);

  useEffect(() => {
    if (!code) return;
    const saved = getRating(code);
    if (saved) setRatings(saved);
  }, [code]);

  if (!contestant) {
    return (
      <div className={styles.error}>
        <p>Land nicht gefunden.</p>
        <button onClick={() => navigate("/")}>Zurück</button>
      </div>
    );
  }

  const allRated = Object.values(ratings).every((v) => v > 0);
  const avg = allRated
    ? Object.values(ratings).reduce((a, b) => a + b, 0) / Object.values(ratings).length
    : null;

  const showImage = heroImageUrl && !heroImgFailed;

  const hero = (
    <>
      <div className={styles.heroBanner}>
        {heroLoading ? (
          <div className={styles.heroSpinner} />
        ) : showImage ? (
          <img
            src={heroImageUrl}
            alt={contestant.artist}
            className={styles.heroImg}
            onError={() => setHeroImgFailed(true)}
          />
        ) : (
          <div className={styles.heroPlaceholder}>
            <span className={styles.heroPlaceholderMic}>🎤</span>
          </div>
        )}
        <div className={styles.heroOverlay}>
          <h1 className={styles.heroArtistName}>{contestant.artist}</h1>
          <p className={styles.heroSongTitle}>„{contestant.song}"</p>
        </div>
      </div>

      <div className={styles.heroInfoBar}>
        <div className={styles.flagWrap}>
          <img
            src={`https://flagcdn.com/w320/${contestant.countryCode.toLowerCase()}.png`}
            alt={`Flagge ${contestant.country}`}
            className={styles.flag}
          />
        </div>
        <div className={styles.heroInfoText}>
          <span className={styles.countryName}>{contestant.country}</span>
          <span className={styles.escLabel}>ESC 2026 · Grand Final 🏆</span>
        </div>
        {avg !== null && (
          <div className={styles.avgBadge}>
            <span className={styles.avgStar}>★</span>
            <span>{avg.toFixed(2)}</span>
            <span className={styles.avgMax}>/ 5.00</span>
          </div>
        )}
      </div>
    </>
  );

  function handleSave() {
    if (!code) return;
    saveRating({ countryCode: code, ratings }, userId);
    navigate("/");
  }

  function handleDelete() {
    if (!code) return;
    deleteRating(code, userId);
    navigate("/");
  }

  function setCategory(key: keyof CategoryRatings, val: number) {
    setRatings((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => navigate("/")}>← Zurück</button>

        {hero}

        <div className={styles.categories}>
          {CATEGORIES.map((cat) => (
            <div key={cat.key} className={styles.category}>
              <div className={styles.catHeader}>
                <span className={styles.catEmoji}>{cat.emoji}</span>
                <div>
                  <div className={styles.catLabel}>{cat.label}</div>
                  <div className={styles.catDesc}>{cat.description}</div>
                </div>
                <div className={styles.catValue}>
                  {ratings[cat.key] > 0 ? (
                    <span className={styles.catScore}>{ratings[cat.key]}/5</span>
                  ) : (
                    <span className={styles.catEmpty}>—</span>
                  )}
                </div>
              </div>
              <StarRating
                value={ratings[cat.key]}
                onChange={(val) => setCategory(cat.key, val)}
                size={36}
              />
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          {getRating(contestant.countryCode) && (
            <button className={styles.deleteBtn} onClick={handleDelete}>
              Bewertung löschen
            </button>
          )}
          <button className={styles.saveBtn} onClick={handleSave} disabled={!allRated}>
            {allRated
              ? "💾 Bewertung speichern"
              : `Noch ${Object.values(ratings).filter((v) => v === 0).length} Kategorien ausstehend`}
          </button>
        </div>
      </div>
    </div>
  );
}
