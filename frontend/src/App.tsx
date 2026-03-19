/* WHAT IT DO? Defines the full V3 route map and mounts citizen-first public pages for PNYX. */

import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuthRoute, RequireRoleRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { PublicLayout } from "./layout/PublicLayout";
import { HomePage } from "./routes/HomePage";
import { MethodologyPage } from "./routes/MethodologyPage";
import { OpsAdminPage } from "./routes/OpsAdminPage";
import { OpsImportsPage } from "./routes/OpsImportsPage";
import { NotFoundPage } from "./routes/NotFoundPage";
import { NotificationsPage } from "./routes/NotificationsPage";
import { OpsPage } from "./routes/OpsPage";
import { OpsRecordsPage } from "./routes/OpsRecordsPage";
import { PartiesPage } from "./routes/PartiesPage";
import { PartyProfilePage } from "./routes/PartyProfilePage";
import { PromiseClaimDetailPage } from "./routes/PromiseClaimDetailPage";
import { PromiseClaimsOpsPage } from "./routes/PromiseClaimsOpsPage";
import { PromiseIndexPage } from "./routes/PromiseIndexPage";
import { PoliticianProfilePage } from "./routes/PoliticianProfilePage";
import { PoliticiansPage } from "./routes/PoliticiansPage";
import { PromiseDetailPage } from "./routes/PromiseDetailPage";
import { RegisterPage } from "./routes/RegisterPage";
import { SignInPage } from "./routes/SignInPage";
import { SubmitPromiseClaimPage } from "./routes/SubmitPromiseClaimPage";
import { SubmitPoliticianProposalPage } from "./routes/SubmitPoliticianProposalPage";
import { SubmitStatementPage } from "./routes/SubmitStatementPage";

export const App = (): ReactElement => {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/politicians" element={<PoliticiansPage />} />
          <Route path="/politicians/:id" element={<PoliticianProfilePage />} />
          <Route path="/parties" element={<PartiesPage />} />
          <Route path="/parties/:id" element={<PartyProfilePage />} />
          <Route path="/promises" element={<PromiseIndexPage />} />
          <Route path="/promises/:id" element={<PromiseDetailPage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route element={<RequireAuthRoute />}>
            <Route path="/claims/:id" element={<PromiseClaimDetailPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/contribute/politicians/new" element={<SubmitPoliticianProposalPage />} />
            <Route path="/contribute/promises/new" element={<SubmitPromiseClaimPage />} />
            <Route path="/contribute/statements/new" element={<SubmitStatementPage />} />
            <Route element={<RequireRoleRoute minimumRole="moderator" />}>
              <Route path="/ops" element={<OpsPage />} />
              <Route path="/ops/admin" element={<OpsAdminPage />} />
              <Route path="/ops/imports" element={<OpsImportsPage />} />
              <Route path="/ops/records" element={<OpsRecordsPage />} />
              <Route path="/ops/claims" element={<PromiseClaimsOpsPage />} />
            </Route>
          </Route>
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
};
