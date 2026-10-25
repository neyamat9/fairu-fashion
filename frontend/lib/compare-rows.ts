import type { Product } from "@/lib/types";

/** One cell of the comparison: what to print, an optional second line, and whether it is the best of the row. */
export interface CompareCell {
  text: string;
  sub?: string;
  best?: boolean;
  /** several lines (e.g. what is in the box) */
  lines?: string[];
}

export interface CompareRow {
  key: string;
  label: string;
  cells: CompareCell[];
  /** the products do not all say the same thing */
  differs: boolean;
}

export interface CompareSection {
  title: string;
  rows: CompareRow[];
}

type Extra = Product & { warranty?: string };

const money = (n: number) => `৳${n.toLocaleString("en-BD")}`;
const DASH = "—";
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function differs(cells: CompareCell[]) {
  const sig = cells.map((c) => (c.lines ? c.lines.map(norm).join("|") : norm(c.text)));
  return new Set(sig).size > 1;
}

/** Marks the lowest (price) or highest (rating, stock…) cell of a row as the best one, but only when they really differ. */
function markBest(cells: CompareCell[], values: (number | null)[], pick: "min" | "max") {
  const nums = values.filter((v): v is number => v !== null && v > 0);
  if (nums.length < 2 || new Set(nums).size < 2) return;
  const target = pick === "min" ? Math.min(...nums) : Math.max(...nums);
  values.forEach((v, i) => {
    if (v === target) cells[i].best = true;
  });
}

/** Builds every row of the comparison: the overview, then every spec group (merged by name across products), then what is in the box. */
export function buildCompareSections(products: Product[]): CompareSection[] {
  const P = products as Extra[];
  const sections: CompareSection[] = [];
  const row = (key: string, label: string, cells: CompareCell[]): CompareRow => ({ key, label, cells, differs: differs(cells) });

  // ── overview
  const overview: CompareRow[] = [];
  const priceCells: CompareCell[] = P.map((p) => ({ text: money(p.price), sub: p.originalPrice ? `${money(p.originalPrice)} · −${p.discount}%` : undefined }));
  markBest(priceCells, P.map((p) => p.price), "min");
  overview.push(row("price", "Price", priceCells));

  const ratingCells: CompareCell[] = P.map((p) => ({ text: p.avgRating ? `${p.avgRating.toFixed(1)} / 5` : "No ratings yet", sub: p.reviewCount ? `${p.reviewCount} ${p.reviewCount === 1 ? "review" : "reviews"}` : undefined }));
  markBest(ratingCells, P.map((p) => p.avgRating ?? null), "max");
  overview.push(row("rating", "Rating", ratingCells));

  overview.push(row("stock", "Availability", P.map((p) => ({ text: p.stock <= 0 ? "Out of stock" : p.stock < 5 ? `Only ${p.stock} left` : "In stock" }))));
  overview.push(row("brand", "Brand", P.map((p) => ({ text: p.brandName || DASH }))));
  overview.push(row("category", "Category", P.map((p) => ({ text: [p.categoryName, p.subCategoryName].filter(Boolean).join(" › ") || DASH }))));
  overview.push(row("warranty", "Warranty", P.map((p) => ({ text: p.warranty?.trim() || DASH }))));
  overview.push(row("shipping", "Free delivery", P.map((p) => ({ text: p.freeShipping ? "Yes" : "No" }))));
  overview.push(row("options", "Options", P.map((p) => ({ text: p.variants.length ? `${p.variants.length} ${p.variants.length === 1 ? "option" : "options"}` : "Single version", sub: p.variants.slice(0, 3).map((v) => v.label).join(", ") || undefined }))));
  sections.push({ title: "Overview", rows: overview });

  // ── spec groups: merged by group name, then by spec name
  const groupOrder: string[] = [];
  const groups = new Map<string, { title: string; specs: Map<string, { label: string; values: (string | undefined)[] }> }>();
  P.forEach((p, pi) => {
    for (const g of p.specs) {
      const gk = norm(g.groupName);
      if (!groups.has(gk)) {
        groups.set(gk, { title: g.groupName, specs: new Map() });
        groupOrder.push(gk);
      }
      const grp = groups.get(gk)!;
      for (const it of g.items) {
        const sk = norm(it.key);
        if (!grp.specs.has(sk)) grp.specs.set(sk, { label: it.key, values: new Array(P.length).fill(undefined) });
        grp.specs.get(sk)!.values[pi] = it.value;
      }
    }
  });
  for (const gk of groupOrder) {
    const g = groups.get(gk)!;
    const rows = [...g.specs.entries()].map(([sk, s]) => row(`${gk}:${sk}`, s.label, s.values.map((v) => ({ text: v?.trim() || DASH }))));
    if (rows.length) sections.push({ title: g.title, rows });
  }

  // ── in the box
  if (P.some((p) => p.inTheBox.length)) {
    sections.push({ title: "In the box", rows: [row("box", "Included", P.map((p) => ({ text: p.inTheBox.join(", ") || DASH, lines: p.inTheBox.length ? p.inTheBox : undefined })))] });
  }
  return sections;
}
