import { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider, useUser } from "./context/UserContext";
import { useRatingNotifications } from "./hooks/useRatingNotifications";
import { useBingoNotifications } from "./hooks/useBingoNotifications";
import NotificationToastContainer from "./components/NotificationToast";
import type { Toast } from "./components/NotificationToast";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import RatingPage from "./pages/RatingPage";
import ResultsPage from "./pages/ResultsPage";
import BingoPage from "./pages/BingoPage";
import type { ReactNode } from "react";

function RequireUser({ children }: { children: ReactNode }) {
  const { userId } = useUser();
  if (!userId) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// AppRoutes lives inside UserProvider so it can read userId and manage toasts
function AppRoutes() {
  const { userId, username } = useUser();

  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((data: Omit<Toast, "id">) => {
    setToasts((prev) => {
      const next = [...prev, { id: crypto.randomUUID(), ...data }];
      // Max 4 gleichzeitig — älteste fliegt raus
      return next.length > 4 ? next.slice(next.length - 4) : next;
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useRatingNotifications(userId, addToast);
  useBingoNotifications(username, useCallback((data) => {
    addToast({ kind: "bingo", ...data });
  }, [addToast]));

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireUser><HomePage /></RequireUser>} />
        <Route path="/rate/:code" element={<RequireUser><RatingPage /></RequireUser>} />
        <Route path="/results" element={<RequireUser><ResultsPage /></RequireUser>} />
        <Route path="/bingo" element={<RequireUser><BingoPage /></RequireUser>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NotificationToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <AppRoutes />
      </UserProvider>
    </BrowserRouter>
  );
}
