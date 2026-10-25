/** Jump to the top of the page at once — also stops any smooth-scroll (Lenis) momentum that is still running. */
export function scrollTopNow() {
  if (typeof window === "undefined") return;
  const lenis = (window as unknown as { __lenis?: { scrollTo: (n: number, o?: object) => void } }).__lenis;
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  window.scrollTo(0, 0);
}
