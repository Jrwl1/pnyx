/* WHAT IT DO? Exposes the public registration flow and hands off to the email-code sign-in path. */

import { useMemo, useState, type FormEvent, type ReactElement } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { registerAccount } from "../lib/api";
import type { RegisteredAccount } from "../types";

const getSafeRedirect = (value: string | null): string => {
  return value && value.startsWith("/") ? value : "/";
};

export const RegisterPage = (): ReactElement => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState<string>("");
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [createdAccount, setCreatedAccount] = useState<RegisteredAccount | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTarget = useMemo(() => getSafeRedirect(searchParams.get("redirect")), [searchParams]);
  const signInTarget = useMemo(() => {
    if (!createdAccount) {
      return "/sign-in";
    }

    const params = new URLSearchParams({
      email: createdAccount.email
    });
    if (redirectTarget !== "/") {
      params.set("redirect", redirectTarget);
    }
    return `/sign-in?${params.toString()}`;
  }, [createdAccount, redirectTarget]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const account = await registerAccount({
        email,
        captchaToken: captchaToken.trim() || undefined
      });
      setCreatedAccount(account);
      setEmail(account.email);
      setCaptchaToken("");
    } catch (err) {
      setError((err as Error).message || "Unable to register.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stack-lg">
      <section className="record-hero">
        <div className="record-hero-main">
          <p className="eyebrow">Contributor account</p>
          <h1>Create an account for source submissions.</h1>
          <p className="lede">Use one email identity for promise claims, sourced statements, notifications, and moderation updates.</p>
        </div>
        <aside className="record-facts" aria-label="Registration path">
          <div>
            <span>Step 1</span>
            <strong>Email</strong>
          </div>
          <div>
            <span>Step 2</span>
            <strong>Sign-in code</strong>
          </div>
          <div>
            <span>Role</span>
            <strong>User</strong>
          </div>
        </aside>
      </section>

      {createdAccount ? (
        <section className="card stack-sm" aria-live="polite">
          <h2>Registration complete</h2>
          <p>
            Account created for <strong>{createdAccount.email}</strong>.
          </p>
          <p className="meta-line">Role: {createdAccount.role}</p>
          <p className="data-note">Continue to sign in and request a one-time code for this email address.</p>
          <div className="card-link-row">
            <button className="button button-primary" type="button" onClick={() => navigate(signInTarget)}>
              Continue to sign in
            </button>
          </div>
        </section>
      ) : null}

      <section className="card stack-sm">
        <form className="stack-sm" onSubmit={(event) => void onSubmit(event)}>
          <div className="controls-grid">
            <label className="field-group" htmlFor="register-email">
              <span>Email</span>
              <input
                id="register-email"
                className="text-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.fi"
                autoComplete="email"
                required
              />
            </label>

            <label className="field-group" htmlFor="register-captcha">
              <span>Captcha token</span>
              <input
                id="register-captcha"
                className="text-input"
                type="text"
                value={captchaToken}
                onChange={(event) => setCaptchaToken(event.target.value)}
                placeholder="Only required when CAPTCHA enforcement is enabled"
                autoComplete="off"
              />
            </label>
          </div>

          <p className="data-note">
            If registration is rate limited or CAPTCHA enforcement is active, the exact reason is shown here so the next step is clear.
          </p>

          {error ? (
            <p className="meta-line" role="alert">
              {error}
            </p>
          ) : null}

          <div className="card-link-row">
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? "Creating account..." : "Register"}
            </button>
            <Link className="button button-link" to={signInTarget}>
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
};
