import { Routes, Route } from "react-router-dom";
import ShellLayout from "./layouts/Shell";
import HomePage from "./pages/HomePage";
import RestaurantDetailPage from "./pages/RestaurantDetailPage";
import InsightsPage from "./pages/InsightsPage";
import AiConciergePage from "./pages/AiConciergePage";
import FavoritesPage from "./pages/FavoritesPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route element={<ShellLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/concierge" element={<AiConciergePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
