"use client";

/**
 * Whal3Core page loader
 *
 * A full-screen splash: the Whal3Core mark with rings rippling out from its
 * circle. It covers the page until it has loaded, stays up for at least
 * `minDuration` so it never just flashes, then fades out and unmounts.
 * No dependencies beyond React; styles are included in this file.
 *
 * Usage (Next.js app router: app/layout.tsx):
 *
 *   import { PageLoader } from "@/components/page-loader";
 *
 *   <body>
 *     <PageLoader />
 *     {children}
 *   </body>
 *
 * By default it hides once the window "load" event has fired. To control it
 * yourself (e.g. wait for data), pass `loading`; it re-shows if `loading`
 * goes back to true:
 *
 *   <PageLoader loading={!data} />
 *
 * Start entrance animations from `onDone`, which fires as the fade begins,
 * so they play in view rather than behind the loader. Non-React code can
 * listen for the "pageloader:done" event on `document` instead.
 *
 * Safety nets: it hides after `maxDuration` even if loading never finishes,
 * and a CSS fallback hides it one second after that if the page's JS never
 * runs (e.g. hydration fails). With prefers-reduced-motion the rings hold
 * still as a static halo and the minimum duration is skipped.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";

export type PageLoaderProps = {
  /** Leave unset to hide on window load; true shows it, false hides it. */
  loading?: boolean;
  /** Shortest time on screen, in ms. */
  minDuration?: number;
  /** Hide regardless after this many ms. Pass Infinity to turn it off. */
  maxDuration?: number;
  /** Ring and mark colour. */
  color?: string;
  /** Overlay colour; match the page background. */
  background?: string;
  /** Size of the mark in px; the rings scale with it. */
  size?: number;
  /** Text announced to screen readers. */
  label?: string;
  /** Called as the loader starts to fade out. */
  onDone?: () => void;
};

type Phase = "loading" | "leaving" | "gone";

/* Matches the 0.75s fade in the CSS, plus a little slack before unmounting. */
const FADE_MS = 900;

export function PageLoader({
  loading,
  minDuration = 1400,
  maxDuration = 8000,
  color = "#487197",
  background = "#eef1f5",
  size = 72,
  label = "Loading Whal3Core",
  onDone,
}: PageLoaderProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [windowLoaded, setWindowLoaded] = useState(false);
  const shownAt = useRef(0);
  const onDoneRef = useRef(onDone);

  const ready = loading === undefined ? windowLoaded : !loading;

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  // Uncontrolled: wait for the window load event (it may already have fired).
  useEffect(() => {
    if (loading !== undefined) return;
    if (document.readyState === "complete") {
      setWindowLoaded(true);
      return;
    }
    const onLoad = () => setWindowLoaded(true);
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, [loading]);

  // Controlled: show again when `loading` flips back to true.
  useEffect(() => {
    if (loading) setPhase("loading");
  }, [loading]);

  // While showing: note when it appeared and lock page scroll underneath.
  useEffect(() => {
    if (phase !== "loading") return;
    shownAt.current = performance.now();
    const root = document.documentElement;
    root.classList.add("whal3-loader-lock");
    return () => root.classList.remove("whal3-loader-lock");
  }, [phase]);

  // Hide once ready, but not before the minimum time on screen.
  useEffect(() => {
    if (phase !== "loading" || !ready) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elapsed = performance.now() - shownAt.current;
    const wait = Math.max(0, (reduced ? 0 : minDuration) - elapsed);
    const timer = setTimeout(() => setPhase("leaving"), wait);
    return () => clearTimeout(timer);
  }, [phase, ready, minDuration]);

  // Never trap the page if loading never finishes.
  useEffect(() => {
    if (phase !== "loading" || !Number.isFinite(maxDuration)) return;
    const timer = setTimeout(() => setPhase("leaving"), maxDuration);
    return () => clearTimeout(timer);
  }, [phase, maxDuration]);

  // Fade out, tell the page, then unmount.
  useEffect(() => {
    if (phase !== "leaving") return;
    onDoneRef.current?.();
    document.dispatchEvent(new CustomEvent("pageloader:done"));
    const timer = setTimeout(() => setPhase("gone"), FADE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "gone") return null;

  const style = {
    "--whal3-ink": color,
    "--whal3-bg": background,
    "--whal3-size": `${size}px`,
    animationDelay: Number.isFinite(maxDuration) ? `${maxDuration + 1000}ms` : undefined,
    animationName: Number.isFinite(maxDuration) ? undefined : "none",
  } as CSSProperties;

  return (
    <div
      className={phase === "leaving" ? "whal3-loader is-done" : "whal3-loader"}
      style={style}
      role="status"
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="whal3-loader-stage" aria-hidden="true">
        <span className="whal3-loader-ring" />
        <span className="whal3-loader-ring" />
        <span className="whal3-loader-ring" />
        {/* viewBox is squared around the mark's circle so the rings share its centre */}
        <svg className="whal3-loader-mark" viewBox="0 -2.45 52.04 52.04" fill="currentColor">
          <path d="M26.02,0c-7.33,0-13.83,3.74-17.89,9.52.1.08.2.16.3.25.1-.1.21-.19.33-.29.58-.45,1.27-.8,2.13-1.04.31-.09.63-.16.93-.22,1.84-1.93,3.98-3.45,6.36-4.51,2.48-1.11,5.12-1.68,7.85-1.68s5.36.56,7.85,1.68c2.23,1,4.25,2.39,6.01,4.15.81-.2,1.59-.35,2.36-.46C38.17,2.84,32.41,0,26.02,0ZM47.79,18.49c-.56.77-1.14,1.48-1.7,2.12.13.97.19,1.96.19,2.96,0,2.92-.54,5.76-1.61,8.42-1.03,2.57-2.5,4.87-4.37,6.85-1.86,1.97-4.03,3.52-6.44,4.59-2.48,1.11-5.12,1.68-7.85,1.68s-5.36-.56-7.85-1.68c-2.41-1.08-4.58-2.62-6.44-4.59-1.87-1.98-3.34-4.28-4.37-6.85-1.07-2.67-1.61-5.5-1.61-8.42,0-2.28.33-4.5.98-6.63-.08-.14-.18-.27-.29-.38-.41-.25-.95-.47-1.5-.69-.79,2.41-1.22,5.01-1.22,7.71,0,13.02,9.98,23.57,22.29,23.57s22.29-10.55,22.29-23.57c0-1.74-.18-3.44-.52-5.08Z" />
          <path d="M8.76,18.52c.61,1.4,1.51,2.77,2.61,3.83,1.12,1.09,2.37,1.77,3.92,2.48,1.01.45,2.14.6,2.52.66,2.1.35,4.86-.19,5.89-.51.29-.09,4.55-1.92,4.55-1.92,0,0-.5,1.6-.74,2.29-.94,2.64-2.02,5.07-3.98,7.12-.05.14,1.56-.02,2.14-.18,2.62-.74,4.57-2.82,5.98-5.04.56-.89,1.03-1.84,1.44-2.82.61-1.44,1.05-2.96,1.72-4.38,1.58-3.34,4.63-6.23,7.89-7.93.14-.07.3-.15.44-.22,3.04-1.49,6.42-1.75,6.68-1.84-.68-.63-1.69-1.05-2.59-1.22-4.56-.88-10.16,1.04-14.13,3.22-5.39,2.97-10.03,7.9-16.73,7.46-1.89-.12-4.96-1.53-5.37-3.58-.3-1.5,1.7-1.9,2.67-2.49,2.06-1.24,3.01-3.93,2.12-6.19-.26.28-.3.65-.55.96-.97,1.25-2.57,1.16-3.96,1.56-1.25.36-2.33,1.03-2.72,2.33l-.69-.99c-1.64-1.77-3.88-1.16-5.88-2.02-.76-.32-1.41-.86-1.96-1.46-.05.62.06,1.28.21,1.89.02.1.08.17.09.21.02.05,0,.14.02.22.41,1.32,1.31,2.61,2.46,3.37.96.98,3.15,1.4,4.48,2.26.88.77,1.04,1.89,1.48,2.91h0Z" />
          <path d="M48.15,11.38c-5.28.99-10.07,4.2-12.42,9.09-1.17,2.43-1.63,5.18-3.09,7.48l-.07.08s.63-.1.74-.13c1.67-.37,3.51-1.31,4.96-2.19.57-.35,4.88-3.34,5.97-4.91,2.27-2.39,4.51-5.46,5.41-8.67.09-.33.17-.67.28-.99-.08-.06-1.55.19-1.78.24h0Z" />
          <path d="M34.46,32.92c1.37-.6,2.57-1.82,3.37-3.07.71-1.11,1.17-2.31,1.49-3.59l-1.82,1.08c-.83.43-1.67.82-2.54,1.16-.12.12-.09.59-.12.77-.18,1.26-.38,2.52-.82,3.71-.04.18.36-.02.44-.06Z" />
          <path d="M25.51,27.21c.28-.59.49-1.19.66-1.82.03-.12.08-.44.08-.44,0,0-1.82.88-2.78,1.14-3.09.84-6.11.76-9.06-.53-.46-.2-1.34-.71-1.34-.71,0,0,.39.52.55.7,1.19,1.3,2.92,2.1,4.59,2.82.12.05.46.2.57.24,1.73.57,3.74.84,5.56.56.09-.01,1.04-1.67,1.17-1.95Z" />
          <path d="M26.02,36.01l2.81,1.38-2.81,1.54-2.81-1.54,2.81-1.38M26.02,34.87l-5.03,2.47,5.03,2.75,5.03-2.75-5.03-2.47h0Z" />
          <path d="M30.42,40.03v2.87l-2.98,1.54v-2.74l2.98-1.66M31.43,38.31l-4.99,2.79v4.99l4.99-2.59v-5.2h0Z" />
          <path d="M21.62,40.03l2.98,1.66v2.74l-2.98-1.54v-2.87M20.61,38.31v5.2l4.99,2.59v-4.99l-4.99-2.79h0Z" />
        </svg>
      </div>
      <span className="whal3-loader-label">{label}</span>
    </div>
  );
}

const CSS = `
html.whal3-loader-lock {
  overflow: hidden;
  scrollbar-gutter: stable;
}
.whal3-loader {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  background: var(--whal3-bg);
  transition: opacity 0.75s cubic-bezier(0.33, 1, 0.68, 1);
  /* CSS-only fallback in case JS never runs; the delay is set inline. */
  animation: whal3-loader-failsafe 0.75s cubic-bezier(0.33, 1, 0.68, 1) forwards;
  animation-delay: 9s;
}
/* Hidden only once the fade has finished; showing again is instant. */
.whal3-loader.is-done {
  transition:
    opacity 0.75s cubic-bezier(0.33, 1, 0.68, 1),
    visibility 0s linear 0.75s;
  animation: none;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
.whal3-loader-stage {
  position: relative;
  width: var(--whal3-size);
  height: var(--whal3-size);
  color: var(--whal3-ink);
  transition: transform 0.75s cubic-bezier(0.16, 1, 0.3, 1);
}
.whal3-loader.is-done .whal3-loader-stage {
  transform: scale(1.12);
}
/* Each ring starts at the mark's own circle and drifts outward, easing off
   as it fades. Negative delays put all three in flight on first paint. */
.whal3-loader-ring {
  position: absolute;
  inset: 6%;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  background: rgba(72, 113, 151, 0.07);
  background: color-mix(in srgb, currentColor 7%, transparent);
  opacity: 0;
  animation: whal3-loader-ripple 2.7s cubic-bezier(0.33, 1, 0.68, 1) infinite;
}
.whal3-loader-ring:nth-child(2) {
  animation-delay: -0.9s;
}
.whal3-loader-ring:nth-child(3) {
  animation-delay: -1.8s;
}
.whal3-loader-mark {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  animation: whal3-loader-breathe 2.7s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
.whal3-loader-label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
@keyframes whal3-loader-ripple {
  0% {
    transform: scale(0.95);
    opacity: 0;
  }
  8% {
    opacity: 0.55;
  }
  100% {
    transform: scale(3.1);
    opacity: 0;
  }
}
@keyframes whal3-loader-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.96);
  }
}
@keyframes whal3-loader-failsafe {
  to {
    opacity: 0;
    visibility: hidden;
  }
}
/* Reduced motion: hold the rings still as a static halo; the loader still
   fades out, but without the scale. */
@media (prefers-reduced-motion: reduce) {
  .whal3-loader-stage,
  .whal3-loader.is-done .whal3-loader-stage {
    transform: none;
    transition: none;
  }
  .whal3-loader-ring,
  .whal3-loader-mark {
    animation: none;
  }
  .whal3-loader-ring:nth-child(1) {
    transform: scale(1.5);
    opacity: 0.4;
  }
  .whal3-loader-ring:nth-child(2) {
    transform: scale(2.1);
    opacity: 0.24;
  }
  .whal3-loader-ring:nth-child(3) {
    transform: scale(2.7);
    opacity: 0.12;
  }
}
`;
