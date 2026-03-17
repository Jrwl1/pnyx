/* WHAT IT DO? Signs users into the current token-minting backend flow and persists the bearer session in the browser. */

import { useMemo, useState, type FormEvent, type ReactElement } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { AuthenticatedRole } from "../types";

const AUTH_ROLES: AuthenticatedRole[] = ["user", "moderator", "admin"];

const readRole = (value: string | null): AuthenticatedRole => {
  return AUTH_ROLES.includes(value as AuthenticatedRole) ? (value as AuthenticatedRole) : "user";
};

const getSafeRedirect = (value: string | null): string => {
  return value && value.startsWith("/") ? value : "/";
};

export const SignInPage = (): ReactElement => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, signIn, signOut } = useAuth();
  const [userId, setUserId] = useState<string>(searchParams.get("userId") ?? "");
  const [role, setRole] = useState<AuthenticatedRole>(() => readRole(searchParams.get("role")));
  const [secret, setSecret] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTarget = useMemo(() => getSafeRedirect(searchParams.get("redirect")), [searchParams]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await signIn({
        userId,
        role,
        secret
      });
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      setError((err as Error).message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  if (session) {
    return (
      <div className="stack-lg">
        <section className="hero-panel stack-sm">
          <p className="eyebrow">Signed in</p>
          <h1>Your session is active</h1>
          <p className="lede">The browser restored a bearer token from local storage. You can continue to the target route or switch sessions.</p>
        </section>

        <section className="card stack-sm">
          <p>
            Signed in as <strong>{session.userId}</strong>.
          </p>
          <p className="meta-line">Role: {session.role}</p>
          <p className="meta-line">Expires: {session.expiresAt ?? "Not provided by token"}</p>
          <div className="card-link-row">
            <button className="button button-primary" type="button" onClick={() => navigate(redirectTarget)}>
              Continue
            </button>
            <button className="button button-secondary" type="button" onClick={signOut}>
              Sign out first
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <section className="hero-panel stack-sm">
        <p className="eyebrow">Sign in</p>
        <h1>Restore a contributor or moderator session</h1>
        <p className="lede">
          The current backend auth endpoint mints a token from your user ID, role, and the server token secret. This screen reflects that model directly.
        </p>
      </section>

      <section className="card stack-sm">
        <form className="stack-sm" onSubmit={(event) => void onSubmit(event)}>
          <div className="controls-grid">
            <label className="field-group" htmlFor="sign-in-user-id">
              <span>User ID</span>
              <input
                id="sign-in-user-id"
                className="text-input"
                type="text"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                placeholder="Paste the registered or provisioned user ID"
                autoComplete="username"
                required
              />
            </label>

            <label className="field-group" htmlFor="sign-in-role">
              <span>Role</span>
              <select
                id="sign-in-role"
                className="select-input"
                value={role}
                onChange={(event) => setRole(readRole(event.target.value))}
              >
                {AUTH_ROLES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-group" htmlFor="sign-in-secret">
              <span>Token secret</span>
              <input
                id="sign-in-secret"
                className="text-input"
                type="password"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                placeholder="Current backend JWT secret"
                autoComplete="current-password"
                required
              />
            </label>
          </div>

          <p className="data-note">
            Moderation access still depends on signing in with a provisioned moderator or admin identity. Public registration only creates user accounts.
          </p>

          {error ? (
            <p className="meta-line" role="alert">
              {error}
            </p>
          ) : null}

          <div className="card-link-row">
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </button>
            <Link className="button button-link" to="/register">
              Need a user account? Register
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
};
