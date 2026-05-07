import { Navigate, Route, Routes } from "react-router-dom";
import { routes } from "./routes";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { FuelExpensesPage } from "@/pages/expenses/FuelExpensesPage";
import { IncidentCenterPage } from "@/pages/incidents/IncidentCenterPage";
import { NotificationsPage } from "@/pages/notifications/NotificationsPage";
import { PointsOfInterestPage } from "@/pages/poi/PointsOfInterestPage";
import { ProfileSupportPage } from "@/pages/profile/ProfileSupportPage";
import { DriverDocumentsPage } from "@/pages/documents/DriverDocumentsPage";
import { DeliveryDocumentsPage } from "@/pages/documents/DeliveryDocumentsPage";
import { MyTripsPage } from "@/pages/trips/MyTripsPage";
import { TripDetailPage } from "@/pages/trips/TripDetailPage";
import { DeliveryDetailPage } from "@/pages/trips/DeliveryDetailPage";
import { SubDeliveryPage } from "@/pages/trips/SubDeliveryPage";
import { UploadPODPage } from "@/pages/trips/UploadPODPage";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path={routes.dashboard} element={<DashboardPage />} />
        <Route path={routes.trips} element={<MyTripsPage />} />
        <Route path="/trips/:tripId" element={<TripDetailPage />} />
        <Route path="/trips/:tripId/delivery/:deliveryId" element={<DeliveryDetailPage />} />
        <Route path="/trips/:tripId/delivery/:deliveryId/sub" element={<SubDeliveryPage />} />
        <Route path="/trips/:tripId/delivery/:deliveryId/pod" element={<UploadPODPage />} />
        <Route path="/trips/:tripId/documents" element={<DeliveryDocumentsPage />} />
        <Route path={routes.documents} element={<DriverDocumentsPage />} />
        <Route path={routes.poi} element={<PointsOfInterestPage />} />
        <Route path={routes.fuelExpenses} element={<FuelExpensesPage />} />
        <Route path={routes.incidents} element={<IncidentCenterPage />} />
        <Route path={routes.profile} element={<ProfileSupportPage />} />
        <Route path={routes.notifications} element={<NotificationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to={routes.dashboard} replace />} />
    </Routes>
  );
}
