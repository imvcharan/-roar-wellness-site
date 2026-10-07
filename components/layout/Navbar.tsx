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

type MenuId = "about" | "therapy" | "treatments" | "mental-health" | "blog" | "faqs";

export function faqAnchorId(question: string): string {
  return `faq-${question.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuId | null>(null);
  const [cmsEntries, setCmsEntries] = useState<CmsPageLink[]>([]);

  useEffect(() => {
    let mounted = true;
    cmsRequest<{ data: CmsPageLink[] }>("/api/cms/content")
      .then(({ data }) => { if (mounted) setCmsEntries(data); })
      .catch((error: unknown) => console.error("Unable to load published CMS navigation items.", error));
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

  const locationPages = cmsEntries.filter((page) => isLocationService(page.slug));
  const therapyPages = cmsEntries.filter((page) => page.category_slug === "therapy");
  const mentalHealthPages = cmsEntries.filter((page) => page.category_slug === "mental-healthcare");
  const treatmentPages = cmsEntries.filter((page) => page.category_slug === "treatments" && !page.slug.startsWith("luxury-rehabilitation-centre-"));
  const blogPosts = cmsEntries.filter((page) => page.category_slug === "blog");
  const menuItems: Record<MenuId, MenuItem[]> = {
    about: [
      { label: "About Roar Wellness", href: "/about-roarwellness/" },
      { label: "Our approach", href: "/#about" },
      { label: "Our Team", href: "/drug-alcohol-rehabilitation-experts/" },
      { label: "Videos", href: "/videos/" },
    ],
    therapy: therapyPages.map((page) => ({ label: page.title.trim(), href: getCmsContentHref(page.slug, page.category_slug) })),
    treatments: [
      { label: "All Treatments", href: "/services" },
      ...treatmentPages.map((item) => ({ label: item.title.trim(), href: getCmsContentHref(item.slug, item.category_slug) })),
    ],
    "mental-health": mentalHealthPages.map((page) => ({ label: page.title.trim(), href: getCmsContentHref(page.slug, page.category_slug) })),
    blog: [
      { label: "All Blog Posts", href: "/blog" },
      ...blogPosts.map((post) => ({ label: post.title.trim(), href: getCmsContentHref(post.slug, post.category_slug) })),
    ],
    faqs: [{ label: "Frequently asked questions", href: "/#faq" }],
  };

  const menuLabels: Record<MenuId, string> = {
    about: "About Us",
    therapy: "Therapy",
    treatments: "Treatments",
    "mental-health": "Mental Healthcare",
    blog: "Blog",
    faqs: "FAQs",
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
        {isActive && <div id={`${mobile ? "mobile" : "desktop"}-${id}-menu`} className={`header-dropdown-panel ${id === "about" ? "header-dropdown-panel-about" : ""}`}>
          {id === "about" ? <div className="header-dropdown-columns">
            <section className="header-dropdown-column">
              <h2 className="header-dropdown-heading">Main pages</h2>
              {items.map(renderItem)}
            </section>
            <section className="header-dropdown-column">
              <h2 className="header-dropdown-heading">Locations</h2>
              {locationPages.length
                ? locationPages.map((page) => renderItem({ label: page.title.trim(), href: getCmsContentHref(page.slug, page.category_slug) }))
                : <span className="header-dropdown-empty">No locations have been published</span>}
            </section>
          </div> : items.length ? items.map(renderItem) : <span className="header-dropdown-empty">Content will appear when published</span>}
        </div>}
      </div>
    );
  };

  const closeMobileMenu = () => { setIsOpen(false); setActiveMenu(null); };

  return (
    <nav className="site-nav" aria-label="Main navigation">
      <div className="header-bar">
        <div className="header-desktop-links">
          <Link href="/#top" className="nav-link">Home</Link>
          {renderDropdown("about")}
          {renderDropdown("therapy")}
          {renderDropdown("treatments")}
          <Link href="/" aria-label="Roar Wellness home" className="header-brand"><img src="/images/logo.png" alt="Roar Wellness" className="header-logo" /></Link>
          {renderDropdown("mental-health")}
          <Link href="/facility/" className="nav-link">Facility</Link>
          <Link href="/gallery/" className="nav-link">Gallery</Link>
          {renderDropdown("blog")}
          {renderDropdown("faqs")}
          <Link href="/contact-us/" className="nav-link">Contact</Link>
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
          {renderDropdown("therapy", true)}
          {renderDropdown("treatments", true)}
          {renderDropdown("mental-health", true)}
          <Link href="/facility/" className="nav-link" onClick={closeMobileMenu}>Facility</Link>
          <Link href="/gallery/" className="nav-link" onClick={closeMobileMenu}>Gallery</Link>
          {renderDropdown("blog", true)}
          {renderDropdown("faqs", true)}
          <Link href="/contact-us/" className="nav-link" onClick={closeMobileMenu}>Contact</Link>
        </div>}
      </div>
    </nav>
  );
}
