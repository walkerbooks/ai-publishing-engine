"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowUpRight, X } from "lucide-react";
import {
  ART_STYLES,
  type ArtStyle,
  type ArtStyleCategory,
} from "@/lib/constants/art-styles";
import { cn } from "@/lib/utils/cn";

type Panel = {
  category: ArtStyleCategory;
  label: string;
  blurb: string;
  style: ArtStyle;
};

const PANELS: Panel[] = [
  {
    category: "classic",
    label: "Classic",
    blurb: "Oil, ink, and timeless storybook covers.",
    style: ART_STYLES.find((s) => s.id === "classic-oil")!,
  },
  {
    category: "fun",
    label: "Fun",
    blurb: "Bold graphics, cartoons, and comic energy.",
    style: ART_STYLES.find((s) => s.id === "fun-cartoon")!,
  },
  {
    category: "soft",
    label: "Soft",
    blurb: "Watercolor, pastel, and gentle paper-cut moods.",
    style: ART_STYLES.find((s) => s.id === "watercolor")!,
  },
  {
    category: "magical",
    label: "Magical",
    blurb: "Enchanted light and cinematic adventure.",
    style: ART_STYLES.find((s) => s.id === "magical")!,
  },
  {
    category: "cultural",
    label: "Cultural",
    blurb: "Folk patterns and heritage-inspired trails.",
    style: ART_STYLES.find((s) => s.id === "folk")!,
  },
];

function CategoryLightbox({
  panel,
  photos,
  onClose,
}: {
  panel: Panel;
  photos: ArtStyle[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<ArtStyle | null>(null);
  const [closeArmed, setCloseArmed] = useState(false);
  const cols = Math.min(photos.length, 3);

  useEffect(() => {
    // Avoid the opening tap falling through onto the backdrop and closing immediately (common on mobile).
    const t = window.setTimeout(() => setCloseArmed(true), 350);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selected) setSelected(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, selected]);

  const requestClose = () => {
    if (!closeArmed) return;
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] overflow-y-auto bg-walker-charcoal/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`${panel.label} gallery`}
      onClick={requestClose}
    >
      <button
        type="button"
        onClick={requestClose}
        className={cn(
          "fixed right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full sm:right-4 sm:top-4",
          "border border-white/20 bg-white/10 text-white transition hover:bg-white/20",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-walker-teal",
        )}
        aria-label="Close gallery"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Full-height hit area: empty space closes; title + photo cards keep the event. */}
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-3 py-14 sm:p-6">
        {selected ? (
          <div
            className="flex w-full max-w-xl flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-square w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl shadow-black/40">
              <Image
                src={selected.src}
                alt={selected.name}
                fill
                sizes="512px"
                className="object-cover"
                priority
              />
            </div>
            <p className="text-center text-sm font-medium text-white">{selected.name}</p>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2",
                "text-sm font-medium text-white transition hover:bg-white/20",
              )}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back
            </button>
          </div>
        ) : (
          <>
            <div
              className="mx-auto w-fit max-w-xl px-2 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-walker-teal">
                {panel.label}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-white sm:text-2xl">
                {photos.length} direction{photos.length === 1 ? "" : "s"}
              </h3>
            </div>
            <ul
              className={cn(
                "pointer-events-none mx-auto grid w-full gap-2 sm:gap-2.5",
                cols === 1 && "max-w-[220px] grid-cols-1",
                cols === 2 && "max-w-[400px] grid-cols-2",
                cols >= 3 && "max-w-[560px] grid-cols-2 sm:grid-cols-3",
              )}
            >
              {photos.map((photo) => (
                <li key={photo.id} className="pointer-events-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(photo);
                    }}
                    className={cn(
                      "group relative block aspect-square w-full overflow-hidden rounded-xl touch-manipulation",
                      "ring-1 ring-white/15 transition duration-300",
                      "hover:scale-[1.03] hover:ring-walker-teal/50",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-walker-teal",
                    )}
                    aria-label={`View ${photo.name}`}
                  >
                    <Image
                      src={photo.src}
                      alt=""
                      fill
                      sizes="180px"
                      className="pointer-events-none object-cover transition duration-500 group-hover:scale-105"
                    />
                    {photo.popular ? (
                      <span className="absolute right-2 top-2 rounded-full bg-walker-teal px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-walker-charcoal">
                        Popular
                      </span>
                    ) : null}
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 text-left">
                      <span className="block truncate text-xs font-medium text-white">
                        {photo.name}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function ArtStylesGallery() {
  const [active, setActive] = useState(0);
  const [openCategory, setOpenCategory] = useState<ArtStyleCategory | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const openPanel = useMemo(
    () => PANELS.find((p) => p.category === openCategory) ?? null,
    [openCategory],
  );

  const openPhotos = useMemo(
    () =>
      openCategory ? ART_STYLES.filter((s) => s.category === openCategory) : [],
    [openCategory],
  );

  return (
    <section
      id="art-styles"
      aria-labelledby="art-styles-heading"
      className="scroll-mt-[calc(3.5rem+0.125rem)] border-t border-border bg-background px-4 py-16 sm:scroll-mt-[calc(5rem+0.125rem)] sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div
          className={cn(
            "overflow-hidden rounded-2xl border border-border bg-white shadow-sm",
            "dark:border-white/10 dark:bg-walker-night",
          )}
        >
          <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
            <div className="flex flex-col justify-between gap-6 px-4 py-6 sm:gap-10 sm:px-8 sm:py-10 lg:min-h-[520px] lg:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-walker-teal">
                  Cover styles
                </p>
                <h2
                  id="art-styles-heading"
                  className="mt-3 text-2xl font-semibold tracking-tight text-walker-charcoal dark:text-walker-mist sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]"
                >
                  Find the look your book deserves
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">
                  <span className="lg:hidden">Tap a mood to open its photo gallery.</span>
                  <span className="hidden lg:inline">
                    Peek across moods, then click a strip to browse that gallery — same story,
                    different shelf presence.
                  </span>
                </p>
              </div>

              <div className="hidden items-end gap-4 lg:flex">
                <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg ring-1 ring-border dark:ring-white/10">
                  <Image
                    src={PANELS[active]?.style.src ?? ART_STYLES[0].src}
                    alt=""
                    fill
                    sizes="112px"
                    className="object-cover transition duration-500"
                  />
                </div>
                <div className="min-w-0 pb-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-walker-slate">
                    Now viewing
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-walker-charcoal dark:text-walker-mist">
                    {PANELS[active]?.style.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{PANELS[active]?.label} styles</p>
                </div>
              </div>
            </div>

            {/* Phone: stacked mood cards */}
            <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2 lg:hidden">
              {PANELS.map((panel, index) => {
                const count = ART_STYLES.filter((s) => s.category === panel.category).length;
                return (
                  <button
                    key={panel.category}
                    type="button"
                    onClick={() => {
                      setActive(index);
                      setOpenCategory(panel.category);
                    }}
                    aria-label={`Open ${panel.label} gallery`}
                    className={cn(
                      "relative aspect-[4/3] overflow-hidden rounded-xl text-left touch-manipulation",
                      "ring-1 ring-border transition active:scale-[0.99]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-walker-teal",
                      "dark:ring-white/10",
                    )}
                  >
                    <Image
                      src={panel.style.src}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="pointer-events-none object-cover"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-walker-charcoal/85 via-walker-charcoal/25 to-transparent"
                      aria-hidden
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-walker-teal">
                        {panel.label}
                      </p>
                      <p className="mt-0.5 text-base font-semibold text-white">{panel.style.name}</p>
                      <p className="mt-1 text-[11px] text-white/70">
                        {count} photo{count === 1 ? "" : "s"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Desktop: Kindle-style vertical accordion */}
            <div
              className={cn(
                "hidden h-[380px] w-full gap-1.5 p-2 sm:h-[440px] sm:gap-2 sm:p-3",
                "lg:flex lg:h-auto lg:min-h-[520px]",
              )}
              onMouseLeave={() => setActive(0)}
            >
              {PANELS.map((panel, index) => {
                const isActive = active === index;
                const count = ART_STYLES.filter((s) => s.category === panel.category).length;

                return (
                  <button
                    key={panel.category}
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onFocus={() => setActive(index)}
                    onClick={() => {
                      setActive(index);
                      setOpenCategory(panel.category);
                    }}
                    aria-pressed={isActive}
                    aria-label={`Open ${panel.label} gallery`}
                    className={cn(
                      "group relative min-w-0 overflow-hidden rounded-xl text-left",
                      "transition-[flex-grow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-walker-teal focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-walker-night",
                      isActive ? "flex-[3.2]" : "flex-[0.55] sm:flex-[0.65]",
                    )}
                  >
                    <Image
                      src={panel.style.src}
                      alt=""
                      fill
                      sizes={isActive ? "(max-width: 1024px) 60vw, 40vw" : "120px"}
                      className={cn(
                        "object-cover transition duration-700 ease-out",
                        isActive ? "scale-100" : "scale-110",
                      )}
                      priority={index < 2}
                    />
                    <div
                      className={cn(
                        "absolute inset-0 transition duration-500",
                        isActive
                          ? "bg-gradient-to-t from-walker-charcoal/85 via-walker-charcoal/25 to-walker-charcoal/10"
                          : "bg-walker-charcoal/45 group-hover:bg-walker-charcoal/35",
                      )}
                      aria-hidden
                    />

                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 flex w-full items-end justify-center pb-6 transition-opacity duration-300",
                        isActive ? "pointer-events-none opacity-0" : "opacity-100",
                      )}
                    >
                      <span
                        className="origin-center whitespace-nowrap text-sm font-semibold tracking-wide text-white drop-shadow-md sm:text-base"
                        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                      >
                        {panel.label}
                      </span>
                    </span>

                    <div
                      className={cn(
                        "absolute inset-0 flex flex-col justify-between p-4 sm:p-5",
                        "transition-opacity duration-300",
                        isActive ? "opacity-100" : "pointer-events-none opacity-0",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        {panel.style.popular ? (
                          <span className="rounded-full bg-walker-teal px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-walker-charcoal">
                            Popular
                          </span>
                        ) : (
                          <span />
                        )}
                        <ArrowUpRight
                          className="h-5 w-5 text-white/90"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                      </div>
                      <div className="max-w-[16rem]">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-walker-teal">
                          {panel.label}
                        </p>
                        <p className="mt-1.5 text-xl font-semibold text-white sm:text-2xl">
                          {panel.style.name}
                        </p>
                        <p className="mt-2 text-sm leading-snug text-white/80">{panel.blurb}</p>
                        <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-white/55">
                          Click to open {count} photo{count === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {mounted && openPanel ? (
        <CategoryLightbox
          panel={openPanel}
          photos={openPhotos}
          onClose={() => setOpenCategory(null)}
        />
      ) : null}
    </section>
  );
}
