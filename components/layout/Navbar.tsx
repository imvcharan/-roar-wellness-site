"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

interface NavigationLink {
  label: string;
  href: string;
}

const navigationLinks: NavigationLink[] = [
  { label: "Home", href: "/#top" },
  { label: "About", href: "/about-roarwellness/" },
  { label: "Services", href: "/services/" },
  { label: "Blogs", href: "/blog/" },
  { label: "Contact", href: "/contact-us/" },
  { label: "Schedule", href: "/appointment/" },
];

function NavigationItem({ link, onClick }: { link: NavigationLink; onClick?: () => void }) {
  return (
    <Link href={link.href} className="nav-link rolling-nav-link" aria-label={link.label} onClick={onClick}>
      <span aria-hidden="true" className="rolling-nav-label">
        {Array.from(link.label).map((character, index) => (
          <span key={`${character}-${index}`} className="rolling-nav-character">{character}</span>
        ))}
      </span>
    </Link>
  );
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  const closeMobileMenu = () => setIsOpen(false);
  const desktopLinks = navigationLinks.slice(0, 3);
  const rightLinks = navigationLinks.slice(3);

  return (
    <nav className={`site-nav${isOpen ? " is-mobile-open" : ""}`} aria-label="Main navigation">
      <div className="header-bar">
        <div className="header-desktop-links">
          {desktopLinks.map((link) => <NavigationItem key={link.label} link={link} />)}
          <Link href="/" aria-label="Roar Wellness home" className="header-brand">
            <img src="/images/logo.png" alt="Roar Wellness" className="header-logo" />
          </Link>
          {rightLinks.map((link) => <NavigationItem key={link.label} link={link} />)}
        </div>
        <div className="header-mobile-row">
          <Link href="/#top" aria-label="Roar Wellness home" className="header-brand">
            <img src="/images/logo.png" alt="Roar Wellness" className="header-logo" />
          </Link>
          <button type="button" className="header-menu-button" aria-label={isOpen ? "Close menu" : "Open menu"} aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
            {isOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
        {isOpen && <div className="header-mobile-links">
          {navigationLinks.map((link) => <NavigationItem key={link.label} link={link} onClick={closeMobileMenu} />)}
        </div>}
      </div>
    </nav>
  );
}
