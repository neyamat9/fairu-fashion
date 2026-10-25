"use client";

import { useEffect, useRef, useState } from "react";

export interface UseInViewOptions extends IntersectionObserverInit {
  /**
   * Once true, stop observing (animation plays once and stays visible).
   * Defaults to true — set to false for repeated trigger on scroll in/out.
   */
  triggerOnce?: boolean;
}

export interface UseInViewResult {
  ref: React.RefObject<HTMLElement | null>;
  inView: boolean;
}

/**
 * Intersection Observer hook that returns { ref, inView }.
 * Attach `ref` to any DOM element; `inView` becomes true when the element
 * enters the viewport according to the configured threshold.
 *
 * Default threshold: 0.1 (10% visible triggers the animation).
 */
export function useInView(options: UseInViewOptions = {}): UseInViewResult {
  const { threshold = 0.1, root = null, rootMargin = "0px", triggerOnce = true } = options;

  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // SSR / old browser guard
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setInView(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      { threshold, root, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, root, rootMargin, triggerOnce]);

  return { ref, inView };
}
