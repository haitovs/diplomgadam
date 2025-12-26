import { Route, Routes } from "react-router-dom";
import ShellLayout from "./layouts/Shell";
import AiConciergePage from "./pages/AiConciergePage";
import FavoritesPage from "./pages/FavoritesPage";
import HomePage from "./pages/HomePage";
import InsightsPage from "./pages/InsightsPage";
import NotFoundPage from "./pages/NotFoundPage";
import RestaurantDetailPage from "./pages/RestaurantDetailPage";

// Admin pages
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminRestaurantsPage from "./pages/AdminRestaurantsPage";

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<ShellLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/concierge" element={<AiConciergePage />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route path="/admin/restaurants" element={<AdminRestaurantsPage />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
