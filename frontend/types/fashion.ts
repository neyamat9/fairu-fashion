export interface ColorVariant {
  id: string;
  name: string;
  hex: string;
  accentHex: string;
  texturePattern: string;
  fabricType: string;
}

export interface FashionProduct3D {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  brand: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewsCount: number;
  description: string;
  imageFront: string;
  imageBack: string;
  fabricDetails: {
    kameez: string;
    dupatta: string;
    salwar: string;
  };
  inTheBox: string[];
  sizes: string[];
  colors: ColorVariant[];
  defaultColorId: string;
  category: string;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  texturePattern: string;
}
