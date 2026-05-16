import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading } = useUser();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setError(null);
    try {
      await login(trimmed);
      navigate("/");
    } catch {
      setError("Verbindungsfehler – bitte versuche es erneut.");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>ESC 2026</h1>
        <p className={styles.subtitle}>Ranking App</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label} htmlFor="username">
            Dein Name
          </label>
          <input
            id="username"
            className={styles.input}
            type="text"
            placeholder="Name eingeben..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            autoFocus
            autoComplete="off"
          />
          {error && <p className={styles.error}>{error}</p>}
          <button
            className={styles.btn}
            type="submit"
            disabled={!name.trim() || isLoading}
          >
            {isLoading ? "Wird geladen…" : "Los geht's →"}
          </button>
        </form>
      </div>
    </div>
  );
}
