import { Route, Routes } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";
import ShellLayout from "./layouts/Shell";
import StorePortalLayout from "./layouts/StorePortalLayout";

import FavoritesPage from "./pages/FavoritesPage";
import HomePage from "./pages/HomePage";
import MapPage from "./pages/MapPage";
import NotFoundPage from "./pages/NotFoundPage";
import StoreDetailPage from "./pages/StoreDetailPage";

import StoreAccountPage from "./pages/store/StoreAccountPage";
import StoreAuthPage from "./pages/store/StoreAuthPage";
import StoreHoursPage from "./pages/store/StoreHoursPage";
import StoreListingPage from "./pages/store/StoreListingPage";
import StoreMenuPage from "./pages/store/StoreMenuPage";
import StoreOverviewPage from "./pages/store/StoreOverviewPage";
import StorePhotosPage from "./pages/store/StorePhotosPage";

import AdminAdminsPage from "./pages/admin/AdminAdminsPage";
import AdminAuditPage from "./pages/admin/AdminAuditPage";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminStoreDetailPage from "./pages/admin/AdminStoreDetailPage";
import AdminStoresPage from "./pages/admin/AdminStoresPage";

export default function App() {
  return (
    <Routes>
      {/* Public site */}
      <Route element={<ShellLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/restaurants/:slug" element={<StoreDetailPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
      </Route>

      {/* Store owner portal */}
      <Route path="/store" element={<StoreAuthPage mode="signin" />} />
      <Route path="/store/register" element={<StoreAuthPage mode="register" />} />
      <Route path="/store/dashboard" element={<StorePortalLayout />}>
        <Route index element={<StoreOverviewPage />} />
        <Route path="listing" element={<StoreListingPage />} />
        <Route path="hours" element={<StoreHoursPage />} />
        <Route path="menu" element={<StoreMenuPage />} />
        <Route path="photos" element={<StorePhotosPage />} />
        <Route path="account" element={<StoreAccountPage />} />
      </Route>

      {/* Admin panel */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="queue" element={<AdminStoresPage queueOnly />} />
        <Route path="stores" element={<AdminStoresPage />} />
        <Route path="stores/:storeId" element={<AdminStoreDetailPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="admins" element={<AdminAdminsPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
