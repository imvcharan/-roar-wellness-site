"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { treatmentNavigationLinks } from "@/lib/treatment-navigation";

interface NavigationLink {
  label: string;
  href: string;
  children?: NavigationLink[];
}

const navigationLinks: NavigationLink[] = [
  { label: "Home", href: "/#top" },
  {
    label: "About Us",
    href: "/about-roarwellness/",
    children: [
      { label: "Company Profile", href: "/about-roarwellness/" },
      { label: "Our Team", href: "/drug-alcohol-rehabilitation-experts/" },
      { label: "Videos", href: "/videos/" },
    ],
  },
  {
    label: "Therapy",
    href: "/services/?category=therapy",
    children: [
      { label: "Game Therapy", href: "/services/game-therapy/" },
      { label: "Yoga & Meditation", href: "/services/yoga-and-meditation/" },
      { label: "TMS Therapy", href: "/services/tms-therapy/" },
    ],
  },
  {
    label: "Treatments",
    href: "/services/?category=treatments",
    children: treatmentNavigationLinks,
  },
  {
    label: "Mental Healthcare",
    href: "/services/psychiatrist-in-delhi/",
    children: [
      { label: "Schizophrenia Treatment", href: "/services/schizophrenia-treatment-in-delhi/" },
      { label: "Bipolar Disorder", href: "/services/treatment-of-personality-disorders/" },
      { label: "ADHD Treatment", href: "/services/adhd-treatment-in-delhi/" },
      { label: "Dementia Treatment", href: "/services/dementia-treatment-in-delhi/" },
      { label: "Psychosis Treatment", href: "/services/?category=mental-healthcare" },
      { label: "BPD Treatment", href: "/services/?category=mental-healthcare" },
    ],
  },
  { label: "Blogs", href: "/blog/" },
  { label: "Facility", href: "/facility/" },
  { label: "Gallery", href: "/gallery/" },
  {
    label: "Faqs",
    href: "/faqs/",
    children: [
      { label: "About Substance Abuse", href: "/about-substance-abuse/" },
      { label: "12 Step Program", href: "/12-step-program-delhi/" },
      { label: "AA 20 Questions", href: "/aa-20-questions/" },
      { label: "Women Rehab Centre", href: "/services/rehab-centre-female-delhi/" },
      { label: "News", href: "/news/" },
    ],
  },
  { label: "Appointment", href: "/appointment/" },
  { label: "Contact Us", href: "/contact-us/" },
];

function NavigationItem({
  link,
  onClick,
  menuOwner,
  isMenuSuppressed = false,
}: {
  link: NavigationLink;
  onClick?: () => void;
  menuOwner?: string;
  isMenuSuppressed?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmenuDismissed, setIsSubmenuDismissed] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const hasChildren = Boolean(link.children?.length);
  const className = "nav-link rolling-nav-link";
  const handleNavigate = () => {
    setIsExpanded(false);
    onClick?.();
  };
  const content = (
    <span aria-hidden="true" className="rolling-nav-label">
      {Array.from(link.label).map((character, index) => (
        <span key={`${character}-${index}`} className="rolling-nav-character">{character === " " ? "\u00a0" : character}</span>
      ))}
    </span>
  );

  useEffect(() => {
    setIsExpanded(false);
  }, [pathname]);

  useEffect(() => {
    if (!isExpanded) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && itemRef.current?.contains(event.target)) return;
      setIsExpanded(false);
      if (document.activeElement instanceof HTMLElement && itemRef.current?.contains(document.activeElement)) {
        document.activeElement.blur();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [isExpanded]);

  return (
    <div
      ref={itemRef}
      data-menu-owner={menuOwner === link.label ? link.label : undefined}
      className={`nav-item${hasChildren ? " has-children" : ""}${isExpanded ? " is-expanded" : ""}${isMenuSuppressed || isSubmenuDismissed ? " is-navigation-suppressed" : ""}`}
      onMouseEnter={() => setIsSubmenuDismissed(false)}
      onKeyDown={(event) => {
        if (!hasChildren || event.key !== "Escape") return;
        setIsExpanded(false);
        if (window.matchMedia("(min-width: 1101px)").matches) setIsSubmenuDismissed(true);
        if (document.activeElement instanceof HTMLElement && itemRef.current?.contains(document.activeElement)) {
          document.activeElement.blur();
        }
      }}
      onMouseLeave={() => {
        if (window.matchMedia("(min-width: 1101px)").matches) {
          setIsExpanded(false);
          setIsSubmenuDismissed(false);
        }
      }}
    >
      <div className="nav-item-trigger">
        {link.href.startsWith("tel:") ? (
          <a href={link.href} className={className} aria-label={link.label} onClick={handleNavigate}>{content}</a>
        ) : (
          <Link href={link.href} className={className} aria-label={link.label} onClick={handleNavigate}>{content}</Link>
        )}
        {hasChildren && (
          <button
            type="button"
            className="nav-disclosure"
            aria-label={`${isExpanded ? "Hide" : "Show"} ${link.label} submenu`}
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((expanded) => !expanded)}
          >
            <ChevronDown size={13} aria-hidden="true" />
          </button>
        )}
      </div>
      {hasChildren && (
        <div className="nav-dropdown">
          {link.children?.map((child) => (
            <NavigationItem key={child.label} link={child} onClick={onClick} menuOwner={menuOwner} isMenuSuppressed={isMenuSuppressed} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [suppressedMenu, setSuppressedMenu] = useState<string | null>(null);
  const suppressedMenuPointer = useRef<{ x: number; y: number } | null>(null);
  const headerBarRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setSuppressedMenu(sessionStorage.getItem("roarwellness-suppressed-nav-menu"));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function closeOnOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && headerBarRef.current?.contains(event.target)) return;
      setIsOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      menuButtonRef.current?.focus();
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnDesktop = () => {
      if (window.matchMedia("(min-width: 1101px)").matches) setIsOpen(false);
    };
    window.addEventListener("resize", closeOnDesktop);
    return () => window.removeEventListener("resize", closeOnDesktop);
  }, [isOpen]);

  useEffect(() => {
    const closeFocusedDesktopMenu = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !(document.activeElement instanceof HTMLElement)) return;
      const focusedMenu = document.activeElement.closest(".header-desktop-links .nav-item");
      if (focusedMenu && !focusedMenu.contains(event.target)) document.activeElement.blur();
    };
    document.addEventListener("pointerdown", closeFocusedDesktopMenu);
    return () => document.removeEventListener("pointerdown", closeFocusedDesktopMenu);
  }, []);

  useEffect(() => {
    if (!suppressedMenu) return;
    const clearAfterPointerLeavesNavigation = (event: PointerEvent) => {
      const origin = suppressedMenuPointer.current;
      if (origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < 12) return;
      const desktopLinks = document.querySelector(".header-desktop-links");
      if (desktopLinks && event.target instanceof Node && desktopLinks.contains(event.target)) return;
      sessionStorage.removeItem("roarwellness-suppressed-nav-menu");
      suppressedMenuPointer.current = null;
      setSuppressedMenu(null);
    };
    document.addEventListener("pointermove", clearAfterPointerLeavesNavigation);
    return () => document.removeEventListener("pointermove", clearAfterPointerLeavesNavigation);
  }, [suppressedMenu]);

  const closeMobileMenu = () => setIsOpen(false);
  const suppressDesktopMenu = (label: string, x: number, y: number) => {
    suppressedMenuPointer.current = { x, y };
    sessionStorage.setItem("roarwellness-suppressed-nav-menu", label);
    setSuppressedMenu(label);
  };
  const desktopLinks = navigationLinks.slice(0, 5);
  const rightLinks = navigationLinks.slice(5);
  const callButton = (
    <a href="tel:+919319977207" className="header-call-button" aria-label="Call Roar Wellness at +91 93199 77207">
      <Phone size={15} strokeWidth={2.2} aria-hidden="true" />
      <span>Call Now</span>
    </a>
  );

  return (
    <nav className={`site-nav${isOpen ? " is-mobile-open" : ""}`} aria-label="Main navigation">
      <div ref={headerBarRef} className="header-bar">
        <div
          className="header-desktop-links"
          onClickCapture={(event) => {
            if (!(event.target instanceof Element) || !event.target.closest("a")) return;
            const menu = event.target.closest<HTMLElement>(".header-desktop-links > .nav-item");
            if (menu?.dataset.menuOwner) suppressDesktopMenu(menu.dataset.menuOwner, event.clientX, event.clientY);
          }}
        >
          {desktopLinks.map((link) => <NavigationItem
            key={link.label}
            link={link}
            menuOwner={link.label}
            isMenuSuppressed={suppressedMenu === link.label}
          />)}
          <Link href="/" aria-label="Roar Wellness home" className="header-brand">
            <img src="/images/logo.png" alt="Roar Wellness" className="header-logo" />
          </Link>
          {rightLinks.map((link) => <NavigationItem
            key={link.label}
            link={link}
            menuOwner={link.label}
            isMenuSuppressed={suppressedMenu === link.label}
          />)}
          {callButton}
        </div>
        <div className="header-mobile-row">
          <Link href="/#top" aria-label="Roar Wellness home" className="header-brand">
            <img src="/images/logo.png" alt="Roar Wellness" className="header-logo" />
          </Link>
          {callButton}
          <button ref={menuButtonRef} type="button" className="header-menu-button" aria-label={isOpen ? "Close menu" : "Open menu"} aria-expanded={isOpen} aria-controls="header-mobile-links" onClick={() => setIsOpen((open) => !open)}>
            {isOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
        {isOpen && (
          <div
            id="header-mobile-links"
            className="header-mobile-links"
            onClickCapture={(event) => {
              if (event.target instanceof Element && event.target.closest("a")) closeMobileMenu();
            }}
          >
            {navigationLinks.map((link) => <NavigationItem key={link.label} link={link} onClick={closeMobileMenu} />)}
          </div>
        )}
      </div>
    </nav>
  );
}
