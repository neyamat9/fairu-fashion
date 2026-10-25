"use client";

import { useEffect } from "react";

interface NoIndexWhenFilteredProps {
  /** When true, injects <meta name="robots" content="noindex"> into <head> */
  noIndex: boolean;
}

/**
 * Dynamically injects or removes a robots noindex meta tag based on whether
 * filters are active. Used on the product listing and search pages to prevent
 * crawlers from indexing filtered/parameterised URLs.
 */
export default function NoIndexWhenFiltered({ noIndex }: NoIndexWhenFilteredProps) {
  useEffect(() => {
    const META_ID = "dynamic-robots-noindex";
    let tag = document.getElementById(META_ID) as HTMLMetaElement | null;

    if (noIndex) {
      if (!tag) {
        tag = document.createElement("meta");
        tag.id = META_ID;
        tag.name = "robots";
        document.head.appendChild(tag);
      }
      tag.content = "noindex";
    } else {
      tag?.remove();
    }

    return () => {
      // Clean up on unmount
      document.getElementById(META_ID)?.remove();
    };
  }, [noIndex]);

  // Renders nothing — side-effect only
  return null;
}
