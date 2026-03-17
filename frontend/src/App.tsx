/* WHAT IT DO? Defines the full V3 route map and mounts citizen-first public pages for PNYX. */

import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuthRoute, RequireRoleRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { PublicLayout } from "./layout/PublicLayout";
import { HomePage } from "./routes/HomePage";
import { MethodologyPage } from "./routes/MethodologyPage";
import { NotFoundPage } from "./routes/NotFoundPage";
import { OpsPage } from "./routes/OpsPage";
import { PartiesPage } from "./routes/PartiesPage";
import { PartyProfilePage } from "./routes/PartyProfilePage";
import { PoliticianProfilePage } from "./routes/PoliticianProfilePage";
import { PoliticiansPage } from "./routes/PoliticiansPage";
import { PromiseDetailPage } from "./routes/PromiseDetailPage";
import { RegisterPage } from "./routes/RegisterPage";
import { SignInPage } from "./routes/SignInPage";

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
          <Route path="/promises/:id" element={<PromiseDetailPage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route element={<RequireAuthRoute />}>
            <Route element={<RequireRoleRoute minimumRole="moderator" />}>
              <Route path="/ops" element={<OpsPage />} />
            </Route>
          </Route>
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
};
