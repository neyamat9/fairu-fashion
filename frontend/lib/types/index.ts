export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
}

export interface ProductVariant {
  id: string;
  label: string;
  type: 'color' | 'size' | 'storage' | 'ram';
  colorHex?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  sku: string;
}

export interface SpecItem {
  key: string;
  value: string;
}

export interface SpecGroup {
  groupName: string;
  items: SpecItem[];
}

export interface PinnedSpec {
  icon: 'chip' | 'memory' | 'connector' | 'power' | 'display' | 'storage' | 'speed' | 'weight';
  label: string;
  value: string;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
}

export type ProductBadge = 'NEW' | 'HOT' | 'BEST SELLER' | 'LIMITED STOCK';

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  brand: string;
  brandName: string;
  category: string;
  categoryName: string;
  subCategory: string;
  subCategoryName: string;
  productCode: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  stock: number;
  images: ProductImage[];
  variants: ProductVariant[];
  specs: SpecGroup[];
  pinnedSpecs: PinnedSpec[];
  badges: ProductBadge[];
  soldLast24h: number;
  purchasePoints: number;
  priceHistory: PriceHistoryPoint[];
  inTheBox: string[];
  isFeatured: boolean;
  createdAt: string;
  /** has options (colour / storage…) the customer must pick first */
  hasVariants?: boolean;
  avgRating?: number;
  reviewCount?: number;
  freeShipping?: boolean;
}

export interface SubCategory {
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  subCategories: SubCategory[];
  productCount: number;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  description: string;
  logoUrl: string;
  country: string;
  foundedYear: number;
  productCount: number;
}

export interface Review {
  id: string;
  productId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  date: string;
  helpfulCount: number;
  notHelpfulCount: number;
  verified: boolean;
}

export interface Question {
  id: string;
  productId: string;
  askerName: string;
  questionText: string;
  answerText?: string;
  answererName?: string;
  date: string;
}

export interface CartItem {
  id: string;
  productId: string;
  slug: string;
  name: string;
  price: number;
  variantId?: string;
  variantLabel?: string;
  quantity: number;
  imageUrl: string;
  stock: number;
}

export interface Cart {
  items: CartItem[];
  updatedAt: string;
}

export interface WishlistItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  stock: number;
  addedAt: string;
}

/** The same eleven statuses (and wording) the admin dashboard shows: keep it in step with dashboard/src/components/shared/StatusBadge.tsx. */
export type OrderStatus =
  | 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'In transit' | 'Out for delivery'
  | 'Delivered' | 'Cancelled' | 'Returned' | 'Refunded' | 'On hold';

export interface OrderItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  variantLabel?: string;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

// Where an order is delivered (checkout form)
export interface CheckoutAddress {
  fullName: string;
  phone: string;
  email: string; // guests: for the order emails
  address: string;
  division: string;
  district: string;
  upazila: string;
  postalCode: string;
}

// Only Cash on Delivery and manual bKash are supported — no payment gateway.
export type PaymentMethod = 'Cash on Delivery' | 'bKash' | 'Nagad' | 'Rocket';
/** the mobile-banking methods (send money + transaction ID) */
export const MOBILE_METHODS: PaymentMethod[] = ['bKash', 'Nagad', 'Rocket'];

export interface Order {
  id: string;
  /** the number customers quote, e.g. GB-20260101-0001 */
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  // Present only when paymentMethod is 'bKash' — submitted by the customer,
  // confirmed by an admin against the merchant account.
  bkashTransactionId?: string;
  bkashSenderNumber?: string;
  placedAt: string;
  estimatedDelivery: string;
  statusHistory: { status: OrderStatus; timestamp: string }[];
  rawStatus?: string;
  paymentStatus?: string;
  discountAmount?: number;
  couponCode?: string | null;
  paidAmount?: number;
  dueAmount?: number;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  canCancel?: boolean;
  deliveryNote?: string | null;
  paymentVerifiedAt?: string | null;
  /** when each status was reached, by the server's own timestamps */
  confirmedAt?: string | null;
  processingAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  orderIds: string[];
  createdAt: string;
}

export interface Session {
  userId: string;
  token: string;
  expiresAt: string;
}

export interface CartResult {
  ok: boolean;
  error?: string;
}

export interface CartContextValue {
  cart: Cart;
  /** true until the first cart load finishes */
  loading: boolean;
  addToCart: (product: Omit<CartItem, 'id'>) => Promise<CartResult>;
  removeFromCart: (itemId: string) => Promise<CartResult>;
  updateQuantity: (itemId: string, quantity: number) => Promise<CartResult>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  cartCount: number;
  cartTotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

export interface WishlistContextValue {
  items: WishlistItem[];
  addToVault: (item: Omit<WishlistItem, 'addedAt'>) => Promise<void>;
  removeFromVault: (productId: string) => Promise<void>;
  isInVault: (productId: string) => boolean;
  vaultCount: number;
}

export interface SignupData {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  /** true until we know whether a saved login is still valid */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
}

export interface CompareContextValue {
  compareList: Product[];
  addToCompare: (product: Product) => void;
  removeFromCompare: (productId: string) => void;
  clearCompare: () => void;
  /** replace the whole list (used by the compare page, whose address decides what is compared) */
  replaceCompare: (products: Product[]) => void;
  isInCompare: (productId: string) => boolean;
}

export interface ProductFilters {
  categories?: string[];
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sortBy?: 'price-asc' | 'price-desc' | 'newest' | 'popular';
}
