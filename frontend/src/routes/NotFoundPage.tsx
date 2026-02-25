/* WHAT IT DO? Handles unknown routes and directs users back to the citizen-facing homepage. */

import type { ReactElement } from "react";
import { Link } from "react-router-dom";

export const NotFoundPage = (): ReactElement => {
  return (
    <section className="card stack-sm">
      <h1>Page not found</h1>
      <p>The page you requested does not exist in the public accountability routes.</p>
      <Link to="/">Return to Home</Link>
    </section>
  );
};
