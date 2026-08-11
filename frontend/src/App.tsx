import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Spinner } from "./components/ui";
import ShellLayout from "./layouts/Shell";

import FavoritesPage from "./pages/FavoritesPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import StoreDetailPage from "./pages/StoreDetailPage";

/*
 * Split points, chosen by who actually loads what.
 *
 * The pages above are the public site and stay in the first bundle: a visitor
 * lands on one of them, and deferring them would only add a round trip.
 *
 * Everything below is loaded on demand. The map carries MapLibre, which is
 * larger than the rest of the application put together and is dead weight for
 * anyone who never opens the map. The owner portal and the admin panel are
 * reached by a handful of people and never by an ordinary visitor, so their
 * pages have no business in the bundle everyone downloads. This matters on a
 * mobile connection in Ashgabat far more than it does on a developer's laptop.
 */
const MapPage = lazy(() => import("./pages/MapPage"));

const StorePortalLayout = lazy(() => import("./layouts/StorePortalLayout"));
const StoreAccountPage = lazy(() => import("./pages/store/StoreAccountPage"));
const StoreAuthPage = lazy(() => import("./pages/store/StoreAuthPage"));
const StoreHoursPage = lazy(() => import("./pages/store/StoreHoursPage"));
const StoreListingPage = lazy(() => import("./pages/store/StoreListingPage"));
const StoreMenuPage = lazy(() => import("./pages/store/StoreMenuPage"));
const StoreOverviewPage = lazy(() => import("./pages/store/StoreOverviewPage"));
const StorePhotosPage = lazy(() => import("./pages/store/StorePhotosPage"));

const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const AdminAdminsPage = lazy(() => import("./pages/admin/AdminAdminsPage"));
const AdminAuditPage = lazy(() => import("./pages/admin/AdminAuditPage"));
const AdminCategoriesPage = lazy(() => import("./pages/admin/AdminCategoriesPage"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminLoginPage = lazy(() => import("./pages/admin/AdminLoginPage"));
const AdminStoreDetailPage = lazy(() => import("./pages/admin/AdminStoreDetailPage"));
const AdminStoresPage = lazy(() => import("./pages/admin/AdminStoresPage"));

/**
 * Shown while a route's code is on its way.
 *
 * Deliberately quiet: on a fast connection it is gone before it registers, and
 * a full-page skeleton flashing in and out is worse than a small spinner.
 */
function RouteFallback() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <Spinner className="h-6 w-6 text-clay-600" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
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
    </Suspense>
  );
}
