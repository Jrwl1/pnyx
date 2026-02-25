/* WHAT IT DO? Keeps an internal-only placeholder route for operations without exposing ops language in public navigation. */

import type { ReactElement } from "react";

export const OpsPage = (): ReactElement => {
  return (
    <section className="card stack-sm">
      <h1>Operations</h1>
      <p>This route is reserved for internal moderation tooling and is intentionally excluded from public navigation.</p>
    </section>
  );
};
