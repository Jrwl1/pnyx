/* WHAT IT DO? Defines the full V3 route map and mounts citizen-first public pages for PNYX. */

import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PublicLayout } from "./layout/PublicLayout";
import { HomePage } from "./routes/HomePage";
import { MethodologyPage } from "./routes/MethodologyPage";
import { NotFoundPage } from "./routes/NotFoundPage";
import { OpsPage } from "./routes/OpsPage";
import { PoliticianProfilePage } from "./routes/PoliticianProfilePage";
import { PoliticiansPage } from "./routes/PoliticiansPage";
import { PromiseDetailPage } from "./routes/PromiseDetailPage";

export const App = (): ReactElement => {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/politicians" element={<PoliticiansPage />} />
        <Route path="/politicians/:id" element={<PoliticianProfilePage />} />
        <Route path="/promises/:id" element={<PromiseDetailPage />} />
        <Route path="/methodology" element={<MethodologyPage />} />
        <Route path="/ops" element={<OpsPage />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
