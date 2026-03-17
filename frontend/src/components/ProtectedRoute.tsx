/* WHAT IT DO? Redirects unauthenticated users to sign-in and blocks moderator-only routes for lower roles. */

import type { ReactElement } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingState } from "./PageState";
import { useAuth } from "../context/AuthContext";
import type { AuthenticatedRole } from "../types";

const roleRank: Record<AuthenticatedRole, number> = {
  user: 1,
  moderator: 2,
  admin: 3
};

const buildSignInPath = (pathname: string, search: string, hash: string): string => {
  const target = `${pathname}${search}${hash}`;
  const params = new URLSearchParams();
  if (target !== "/") {
    params.set("redirect", target);
  }

  const query = params.toString();
  return `/sign-in${query ? `?${query}` : ""}`;
};

export const RequireAuthRoute = (): ReactElement => {
  const location = useLocation();
  const { isReady, session } = useAuth();

  if (!isReady) {
    return <LoadingState label="Restoring your session..." />;
  }

  if (!session) {
    return <Navigate to={buildSignInPath(location.pathname, location.search, location.hash)} replace />;
  }

  return <Outlet />;
};

export const RequireRoleRoute = ({ minimumRole }: { minimumRole: AuthenticatedRole }): ReactElement => {
  const location = useLocation();
  const { isReady, session } = useAuth();

  if (!isReady) {
    return <LoadingState label="Checking route access..." />;
  }

  if (!session) {
    return <Navigate to={buildSignInPath(location.pathname, location.search, location.hash)} replace />;
  }

  if (roleRank[session.role] < roleRank[minimumRole]) {
    return (
      <section className="card stack-sm">
        <h1>Access denied</h1>
        <p>This page requires a signed-in {minimumRole} session. Your current role is {session.role}.</p>
        <div className="card-link-row">
          <Link className="button button-link" to="/">
            Return home
          </Link>
          <Link className="button button-link" to="/sign-in">
            Switch session
          </Link>
        </div>
      </section>
    );
  }

  return <Outlet />;
};
