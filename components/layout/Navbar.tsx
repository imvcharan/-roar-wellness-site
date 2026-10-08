"use client";

import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getCmsContentHref, isLocationService } from "@/lib/cms-routes";
import { cmsRequest } from "@/services/cms-api";

interface CmsPageLink {
  title: string;
  slug: string;
  category_slug: string;
}

interface MenuItem {
  label: string;
  href: string;
  reload?: boolean;
}

type MenuId = "about" | "services" | "news";

const treatmentMenuSlugs = [
  "alcohol-addiction",
  "opioid-treatment",
  "heroin-addiction",
  "cocaine-addiction",
  "cannabis-treatment",
  "poly-substance-abuse",
  "benzodiazepine-treatment",
  "morphine-addiction",
  "gambling-treatment",
  "internet-addiction",
  "sex-addiction",
  "drugs-addiction",
  "de-addiction-treatment",
  "marijuana-treatment-in-delhi",
];

const aboutPageSlugs = [
  "about-substance-abuse",
  "12-step-program-delhi",
  "rehab-centre-female-delhi",
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuId | null>(null);
  const [cmsEntries, setCmsEntries] = useState<CmsPageLink[]>([]);
  const [newsPosts, setNewsPosts] = useState<CmsPageLink[]>([]);
  const [newsLoaded, setNewsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    cmsRequest<{ data: CmsPageLink[] }>("/api/cms/content")
      .then(({ data }) => { if (mounted) setCmsEntries(data); })
      .catch((error: unknown) => console.error("Unable to load published CMS navigation items.", error));
    cmsRequest<{ data: CmsPageLink[] }>("/api/content/blog")
      .then(({ data }) => {
        if (!mounted) return;
        setNewsPosts(data);
        setNewsLoaded(true);
      })
      .catch((error: unknown) => {
        console.error("Unable to load published news posts.", error);
        if (mounted) setNewsLoaded(true);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!activeMenu && !isOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveMenu(null);
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeMenu, isOpen]);

  const locationPages = cmsEntries.filter((page) =>
    isLocationService(page.slug) && page.slug !== "rehab-centre-female-delhi"
  );
  const therapyPages = cmsEntries.filter((page) => page.category_slug === "therapy");
  const mentalHealthPages = cmsEntries.filter((page) => page.category_slug === "mental-healthcare");
  const treatmentPages = treatmentMenuSlugs
    .map((slug) => cmsEntries.find((page) => page.slug === slug && page.category_slug === "treatments"))
    .filter((page): page is CmsPageLink => Boolean(page));
  const aboutPages = aboutPageSlugs
    .map((slug) => cmsEntries.find((page) => page.slug === slug))
    .filter((page): page is CmsPageLink => Boolean(page));
  const servicePages = [
    ...therapyPages,
    ...treatmentPages,
    ...mentalHealthPages,
    ...locationPages,
  ];
  const menuItems: Record<MenuId, MenuItem[]> = {
    about: [
      { label: "About Roar Wellness", href: "/about-roarwellness/" },
      { label: "Our approach", href: "/#about" },
      { label: "Our Team", href: "/drug-alcohol-rehabilitation-experts/" },
      { label: "Facility", href: "/facility/" },
      { label: "Gallery", href: "/gallery/" },
      { label: "Videos", href: "/videos/" },
      { label: "FAQs", href: "/faqs/" },
      ...aboutPages.map((page) => ({ label: page.title.trim(), href: getCmsContentHref(page.slug, page.category_slug) })),
    ],
    services: [
      { label: "All Services", href: "/services/" },
      ...servicePages.map((page) => ({ label: page.title.trim(), href: getCmsContentHref(page.slug, page.category_slug) })),
    ],
    news: [
      { label: "All News", href: "/blog/" },
      ...newsPosts.map((post) => ({ label: post.title.trim(), href: getCmsContentHref(post.slug, post.category_slug) })),
    ],
  };

  const menuLabels: Record<MenuId, string> = {
    about: "About",
    services: "Services",
    news: "Blogs",
  };

  const renderDropdown = (id: MenuId, mobile = false) => {
    const isActive = activeMenu === id;
    const items = menuItems[id];
    const renderItem = (item: MenuItem) => {
      const close = () => { setActiveMenu(null); setIsOpen(false); };
      return item.reload
        ? <a key={`${item.href}-${item.label}`} href={item.href} className="header-dropdown-link" onClick={close}>{item.label}</a>
        : <Link key={`${item.href}-${item.label}`} href={item.href} className="header-dropdown-link" onClick={close}>{item.label}</Link>;
    };
    return (
      <div
        key={`${mobile ? "mobile" : "desktop"}-${id}`}
        className={`header-dropdown ${mobile ? "header-dropdown-mobile" : ""} ${isActive ? "is-open" : ""}`}
        onMouseEnter={mobile ? undefined : () => setActiveMenu(id)}
        onMouseLeave={mobile ? undefined : () => setActiveMenu((current) => current === id ? null : current)}
      >
        <button
          type="button"
          className="nav-link header-dropdown-trigger"
          aria-haspopup="true"
          aria-expanded={isActive}
          aria-controls={`${mobile ? "mobile" : "desktop"}-${id}-menu`}
          onClick={() => setActiveMenu((current) => mobile && current === id ? null : id)}
        >
          {menuLabels[id]} <ChevronDown size={14} aria-hidden="true" className={isActive ? "is-rotated" : ""} />
        </button>
        {isActive && <div id={`${mobile ? "mobile" : "desktop"}-${id}-menu`} className="header-dropdown-panel">
          {items.map(renderItem)}
          {id === "news" && !newsPosts.length && <span className="header-dropdown-empty">{newsLoaded ? "No news posts have been published" : "Loading published news..."}</span>}
          {!items.length && id !== "news" && <span className="header-dropdown-empty">Content will appear when published</span>}
        </div>}
      </div>
    );
  };

  const closeMobileMenu = () => { setIsOpen(false); setActiveMenu(null); };

  return (
    <nav className={`site-nav${isOpen ? " is-mobile-open" : ""}`} aria-label="Main navigation">
      <div className="header-bar">
        <div className="header-desktop-links">
          <Link href="/#top" className="nav-link">Home</Link>
          {renderDropdown("about")}
          {renderDropdown("services")}
          <Link href="/" aria-label="Roar Wellness home" className="header-brand"><img src="/images/logo.png" alt="Roar Wellness" className="header-logo" /></Link>
          {renderDropdown("news")}
          <Link href="/contact-us/" className="nav-link">Contact</Link>
          <Link href="/#contact" className="nav-link">Schedule</Link>
        </div>
        <div className="header-mobile-row">
          <Link href="/#top" aria-label="Roar Wellness home" className="header-brand"><img src="/images/logo.png" alt="Roar Wellness" className="header-logo" /></Link>
          <button type="button" className="header-menu-button" aria-label={isOpen ? "Close menu" : "Open menu"} aria-expanded={isOpen} onClick={() => { setIsOpen((open) => !open); setActiveMenu(null); }}>
            {isOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
        {isOpen && <div className="header-mobile-links">
          <Link href="/#top" className="nav-link" onClick={closeMobileMenu}>Home</Link>
          {renderDropdown("about", true)}
          {renderDropdown("services", true)}
          {renderDropdown("news", true)}
          <Link href="/contact-us/" className="nav-link" onClick={closeMobileMenu}>Contact</Link>
          <Link href="/#contact" className="nav-link" onClick={closeMobileMenu}>Schedule</Link>
        </div>}
      </div>
    </nav>
  );
}
