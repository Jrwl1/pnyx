/* WHAT IT DO? Signs users in through launch-safe email codes and restores the persisted bearer session in the browser. */

import { useMemo, useState, type FormEvent, type ReactElement } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const getSafeRedirect = (value: string | null): string => {
  return value && value.startsWith("/") ? value : "/";
};

export const SignInPage = (): ReactElement => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, requestSignInCode, signIn, signOut } = useAuth();
  const [email, setEmail] = useState<string>(searchParams.get("email") ?? "");
  const [code, setCode] = useState<string>("");
  const [codeRequested, setCodeRequested] = useState<boolean>(false);
  const [codePreview, setCodePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const redirectTarget = useMemo(() => getSafeRedirect(searchParams.get("redirect")), [searchParams]);
  const registerTarget = useMemo(() => {
    const params = new URLSearchParams();
    if (redirectTarget !== "/") {
      params.set("redirect", redirectTarget);
    }
    const query = params.toString();
    return `/register${query ? `?${query}` : ""}`;
  }, [redirectTarget]);

  const onRequestCode = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await requestSignInCode(email);
      setCodeRequested(true);
      setCodePreview(response.codePreview);
      setMessage(
        response.codePreview
          ? `A sign-in code was issued for ${email}. Local delivery preview is shown below because inline delivery is enabled.`
          : `If ${email} is registered, a sign-in code was sent.`
      );
    } catch (err) {
      setError((err as Error).message || "Unable to send sign-in code.");
    } finally {
      setSubmitting(false);
    }
  };

  const onVerifyCode = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await signIn({
        email,
        code
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
        <section className="record-hero">
          <div className="record-hero-main">
            <p className="eyebrow">Returning user</p>
            <h1>Your session is active.</h1>
            <p className="lede">Continue where you were headed, or sign out before switching accounts.</p>
          </div>
          <aside className="record-facts" aria-label="Active session">
            <div>
              <span>Role</span>
              <strong>{session.role}</strong>
            </div>
            <div>
              <span>Identity</span>
              <strong>{session.email ?? session.userId}</strong>
            </div>
          </aside>
        </section>

        <section className="card stack-sm">
          <p>
            Signed in as <strong>{session.email ?? session.userId}</strong>.
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
      <section className="record-hero">
        <div className="record-hero-main">
          <p className="eyebrow">Returning user</p>
          <h1>Restore your session by email.</h1>
          <p className="lede">Request a one-time code for the email tied to your PNYX account.</p>
        </div>
        <aside className="record-facts" aria-label="Sign-in steps">
          <div>
            <span>Step 1</span>
            <strong>Email</strong>
          </div>
          <div>
            <span>Step 2</span>
            <strong>Code</strong>
          </div>
          <div>
            <span>Then</span>
            <strong>Return</strong>
          </div>
        </aside>
      </section>

      <section className="card stack-sm">
        <form className="stack-sm" onSubmit={(event) => void onRequestCode(event)}>
          <label className="field-group" htmlFor="sign-in-email">
            <span>Email</span>
            <input
              id="sign-in-email"
              className="text-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.fi"
              autoComplete="email"
              required
            />
          </label>

          <p className="data-note">
            Moderator and admin access depends on a provisioned role attached to this email identity. You never choose a role in the browser.
          </p>

          {message ? <p className="meta-line">{message}</p> : null}
          {error ? (
            <p className="meta-line" role="alert">
              {error}
            </p>
          ) : null}

          <div className="card-link-row">
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? "Sending code..." : "Send sign-in code"}
            </button>
            <Link className="button button-link" to={registerTarget}>
              Need an account? Register
            </Link>
          </div>
        </form>
      </section>

      {codeRequested ? (
        <section className="card stack-sm">
          <form className="stack-sm" onSubmit={(event) => void onVerifyCode(event)}>
            <label className="field-group" htmlFor="sign-in-code">
              <span>One-time code</span>
              <input
                id="sign-in-code"
                className="text-input"
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Enter the 6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </label>

            {codePreview ? (
              <p className="data-note">
                Local delivery preview: <strong>{codePreview}</strong>
              </p>
            ) : null}

            <div className="card-link-row">
              <button className="button button-primary" type="submit" disabled={submitting}>
                {submitting ? "Signing in..." : "Verify code and sign in"}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
};
