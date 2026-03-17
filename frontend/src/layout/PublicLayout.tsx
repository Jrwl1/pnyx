/* WHAT IT DO? Provides the shared citizen-first layout and exact public navigation labels for V3 routes. */

import type { ReactElement } from "react";
import { NavLink, Outlet } from "react-router-dom";

const navClassName = ({ isActive }: { isActive: boolean }): string => {
  return isActive ? "site-nav-link active" : "site-nav-link";
};

export const PublicLayout = (): ReactElement => {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="site-header">
        <div className="content-wrap site-header-inner">
          <div className="brand-block" aria-label="PNYX">
            <span className="brand-mark" aria-hidden="true">
              P
            </span>
            <div>
              <p className="brand-name">PNYX</p>
              <p className="brand-subtitle">Promises tracked against outcomes</p>
            </div>
          </div>

          <nav className="site-nav" aria-label="Public">
            <NavLink to="/" className={navClassName} end>
              Home
            </NavLink>
            <NavLink to="/politicians" className={navClassName}>
              Politicians
            </NavLink>
            <NavLink to="/parties" className={navClassName}>
              Parties
            </NavLink>
            <NavLink to="/methodology" className={navClassName}>
              Methodology
            </NavLink>
          </nav>
        </div>
      </header>

      <main id="main-content" className="content-wrap page-content" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="content-wrap site-footer-inner">
          <p className="site-footer-copy">PNYX · Political accountability through public evidence.</p>
          <NavLink to="/methodology" className="site-footer-link">
            Read methodology
          </NavLink>
        </div>
      </footer>
    </div>
  );
};
