export interface ShowcaseProduct {
  id: string;
  name: string;
  titleLines: string[];
  size: string;
  thumb: string;
  cutout: string;
  accent?: string;
  theme: {
    from: string;
    to: string;
    glow?: string;
  };
  href: string;
}

export const SHOWCASE_PRODUCTS: ShowcaseProduct[] = [
  {
    id: "zamzam-royal",
    name: "Zamzam Royal Three Piece",
    titleLines: ["ZAMZAM", "ROYAL"],
    size: "৳3,450",
    thumb: "/garments/garment-1-front.webp",
    cutout: "/garments/garment-1-front.webp",
    theme: {
      from: "#FB7185", // soft rose
      to: "#E11D48",   // boutique pink
      glow: "rgba(251, 113, 133, 0.4)",
    },
    href: "/products/zamzam-three-piece",
  },
  {
    id: "bin-hamid-luxury",
    name: "Bin Hamid Luxury Lawn",
    titleLines: ["BIN HAMID", "LUXURY"],
    size: "৳3,950",
    thumb: "/garments/garment-2-front.webp",
    cutout: "/garments/garment-2-front.webp",
    theme: {
      from: "#FBBF24", // amber mustard
      to: "#D97706",   // warm bronze
      glow: "rgba(251, 191, 36, 0.4)",
    },
    href: "/products/bin-hamid-three-piece",
  },
  {
    id: "summer-floral",
    name: "Summer Floral Embroidery",
    titleLines: ["SUMMER", "FLORAL"],
    size: "৳2,850",
    thumb: "/garments/garment-3-front.webp",
    cutout: "/garments/garment-3-front.webp",
    theme: {
      from: "#38BDF8", // sky cyan
      to: "#0284C7",   // ocean blue
      glow: "rgba(56, 189, 248, 0.4)",
    },
    href: "/products/summer-floral-embroidery",
  },
  {
    id: "gul-ahmed-silk",
    name: "Gul Ahmed Mint Silk",
    titleLines: ["GUL AHMED", "MINT"],
    size: "৳4,200",
    thumb: "/garments/garment-4-front.webp",
    cutout: "/garments/garment-4-front.webp",
    theme: {
      from: "#34D399", // fresh mint
      to: "#0D9488",   // rich teal
      glow: "rgba(52, 211, 153, 0.4)",
    },
    href: "/products/gul-ahmed-three-piece",
  },
  {
    id: "fairu-exclusive",
    name: "Fairu Exclusive Velvet",
    titleLines: ["FAIRU", "VELVET"],
    size: "৳4,800",
    thumb: "/garments/garment-1-front.webp",
    cutout: "/garments/garment-1-front.webp",
    theme: {
      from: "#C084FC", // soft lilac
      to: "#7C3AED",   // royal violet
      glow: "rgba(192, 132, 252, 0.4)",
    },
    href: "/products/fairu-exclusive-velvet",
  },
];
