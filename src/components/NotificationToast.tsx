import { useState, useEffect, useCallback, useRef } from "react";
import styles from "./NotificationToast.module.css";

export interface Toast {
  id: string;
  countryCode: string;
  countryName: string;
  username: string;
  avg: number;
}

// ── Single toast ───────────────────────────────────────────────────────────

function SingleToast({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [visible, setVisible] = useState(false);
  const removeRef = useRef(onRemove);
  removeRef.current = onRemove;

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => removeRef.current(), 340);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(dismiss, 5000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [dismiss]);

  const scoreColor =
    toast.avg >= 4.5 ? "#FFD700"
    : toast.avg >= 3.5 ? "#22c55e"
    : toast.avg >= 2.5 ? "#eab308"
    : toast.avg >= 1.5 ? "#f97316"
    : "#ef4444";

  return (
    <div className={`${styles.toast} ${visible ? styles.toastVisible : ""}`}>
      {/* Header: flag + country + close */}
      <div className={styles.toastHeader}>
        <div className={styles.toastCountryRow}>
          <img
            src={`https://flagcdn.com/w40/${toast.countryCode.toLowerCase()}.png`}
            alt={toast.countryName}
            className={styles.toastFlag}
          />
          <span className={styles.toastCountry}>{toast.countryName}</span>
        </div>
        <button
          className={styles.toastClose}
          onClick={dismiss}
          aria-label="Schließen"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <p className={styles.toastMsg}>
        <strong>{toast.username}</strong> hat abgestimmt
      </p>
      <p className={styles.toastScore}>
        Ø{" "}
        <span style={{ color: scoreColor, fontWeight: 800 }}>
          {toast.avg.toFixed(1)}
        </span>{" "}
        Punkte für {toast.countryName}
      </p>

      {/* Progress bar */}
      <div className={styles.toastProgress} />
    </div>
  );
}

// ── Container ──────────────────────────────────────────────────────────────

export interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export default function NotificationToastContainer({
  toasts,
  onRemove,
}: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div className={styles.container}>
      {toasts.map((t) => (
        <SingleToast key={t.id} toast={t} onRemove={() => onRemove(t.id)} />
      ))}
    </div>
  );
}
