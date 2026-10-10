"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

interface NavigationLink {
  label: string;
  href: string;
  children?: NavigationLink[];
  menuColumns?: boolean;
  secondaryChildren?: NavigationLink[];
}

const locations: NavigationLink[] = [
  { label: "Chhatarpur", href: "/services/luxury-rehabilitation-centre-chhatarpur/" },
  { label: "CR Park", href: "/services/luxury-rehabilitation-centre-cr-park/" },
  { label: "Greater Kailash", href: "/services/luxury-rehabilitation-centre-greater-kailash/" },
  { label: "Green Park", href: "/services/luxury-rehabilitation-centre-green-park/" },
  { label: "Gurgaon", href: "/services/luxury-rehabilitation-centre-gurgaon/" },
  { label: "Hauz Khas", href: "/services/luxury-rehabilitation-centre-hauz-khas/" },
  { label: "Jaipur", href: "/services/luxury-rehabilitation-centre-jaipur/" },
  { label: "Kanpur", href: "/services/luxury-rehabilitation-centre-kanpur/" },
  { label: "Lucknow", href: "/services/luxury-rehabilitation-centre-lucknow/" },
  { label: "Mehrauli", href: "/services/luxury-rehabilitation-centre-mehrauli/" },
  { label: "RK Puram", href: "/services/luxury-rehabilitation-centre-rk-puram/" },
  { label: "Safdarjung Enclave", href: "/services/luxury-rehabilitation-centre-safdarjung-enclave/" },
  { label: "Saket", href: "/services/luxury-rehabilitation-centre-saket/" },
  { label: "South Ex", href: "/services/luxury-rehabilitation-centre-south-ex/" },
];

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
    menuColumns: true,
    secondaryChildren: locations,
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
    children: [
      { label: "Alcohol Addiction", href: "/services/alcohol-addiction/" },
      { label: "Opioid Treatment", href: "/services/opioid-treatment/" },
      { label: "Heroin Addiction", href: "/services/heroin-addiction/" },
      { label: "Cocaine Addiction", href: "/services/cocaine-addiction/" },
      { label: "Cannabis Treatment", href: "/services/cannabis-treatment/" },
      { label: "Poly Substance Abuse", href: "/services/poly-substance-abuse/" },
      { label: "Benzodiazepine Treatment", href: "/services/benzodiazepine-treatment/" },
      { label: "Morphine Addiction", href: "/services/morphine-addiction/" },
      { label: "Gambling Treatment", href: "/services/gambling-treatment/" },
      { label: "Internet Addiction", href: "/services/internet-addiction/" },
      { label: "Sex Addiction", href: "/services/sex-addiction/" },
      { label: "Drugs Addiction", href: "/services/drugs-addiction/" },
      { label: "De-Addiction Treatment", href: "/services/de-addiction-treatment/" },
      { label: "Marijuana Treatment", href: "/services/marijuana-treatment-in-delhi/" },
    ],
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
  {
    label: "Services",
    href: "/services/",
    children: [
      { label: "Treatments", href: "/services/?category=treatments" },
      { label: "Therapy", href: "/services/?category=therapy" },
      { label: "Mental Healthcare", href: "/services/?category=mental-healthcare" },
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
  { label: "Contact Us", href: "/contact-us/" },
  { label: "Click To Call", href: "tel:+919319977207" },
];

function NavigationItem({
  link,
  onClick,
}: {
  link: NavigationLink;
  onClick?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
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

  return (
    <div
      className={`nav-item${hasChildren ? " has-children" : ""}${isExpanded ? " is-expanded" : ""}`}
      onMouseLeave={() => {
        if (window.matchMedia("(min-width: 1101px)").matches) setIsExpanded(false);
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
        <div className={`nav-dropdown${link.menuColumns ? " nav-dropdown-columns" : ""}`}>
          {link.menuColumns ? (
            <>
              <div className="nav-dropdown-column nav-dropdown-pages" aria-label="About Roar Wellness pages">
                {link.children?.map((child) => (
                  <NavigationItem key={child.label} link={child} onClick={onClick} />
                ))}
              </div>
              <div className="nav-dropdown-column nav-dropdown-locations" aria-label="Locations">
                {link.secondaryChildren?.map((child) => (
                  <NavigationItem key={child.label} link={child} onClick={onClick} />
                ))}
              </div>
            </>
          ) : link.children?.map((child) => (
            <NavigationItem key={child.label} link={child} onClick={onClick} />
          ))}
        </div>
      )}
    </div>
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
  const desktopLinks = navigationLinks.slice(0, 5);
  const rightLinks = navigationLinks.slice(5);

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
        {isOpen && (
          <div className="header-mobile-links">
            {navigationLinks.map((link) => <NavigationItem key={link.label} link={link} onClick={closeMobileMenu} />)}
          </div>
        )}
      </div>
    </nav>
  );
}
