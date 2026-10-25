"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * THE way to build a search box on this site — every search field must use it
 * (header search, brand search in the modal and the filter, and any future one).
 *
 *   const { input, setInput, query, isPending, clear, flush } = useDebouncedSearch(300);
 *
 *   <input value={input} onChange={(e) => setInput(e.target.value)} />   // typing stays instant
 *   // fetch / filter with `query`                                       // updates once typing pauses
 *
 * - `input`     what is in the box right now (bind this to the <input>).
 * - `query`     the trimmed text, updated only after the visitor stops typing for `delay` ms.
 *               Use it to fetch, filter or navigate — never `input`.
 * - `isPending` true while the box and `query` differ (show a spinner if you like).
 * - `clear()`   empties both at once (no waiting), e.g. when a modal reopens.
 * - `flush()`   applies `input` to `query` immediately, e.g. on Enter / form submit.
 */
export function useDebouncedSearch(delay = 300, initial = "") {
  const [input, setInput] = useState(initial);
  const [query, setQuery] = useState(initial.trim());

  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), delay);
    return () => clearTimeout(t);
  }, [input, delay]);

  const clear = useCallback(() => {
    setInput("");
    setQuery("");
  }, []);

  const flush = useCallback(() => setQuery(input.trim()), [input]);

  return { input, setInput, query, isPending: input.trim() !== query, clear, flush };
}
