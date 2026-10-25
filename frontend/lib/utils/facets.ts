import type { ProductFacets } from "../services/products.service";
import type { Brand } from "../types";

// brand facets → the Brand shape the filter sidebar uses
export function facetBrands(f: ProductFacets): Brand[] {
  return f.brands.map((b) => ({ id: b.id, slug: b.slug, name: b.name, description: "", logoUrl: b.logo ?? "", country: "", foundedYear: 0, productCount: b.count }));
}
