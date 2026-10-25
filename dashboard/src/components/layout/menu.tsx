import type { ReactNode } from "react";
import {
  LayoutDashboard, ShoppingBag, PlusCircle, RotateCcw, Users, Boxes, PackagePlus, Warehouse, FolderTree, Handshake, Images,
  TicketPercent, GalleryHorizontal, BellRing, Star, MessageCircleQuestion, LifeBuoy, Mail, Newspaper, BarChart3,
  Bell, Settings, History, ShieldCheck, UserCircle,
} from "lucide-react";
import type { AttentionSummary } from "@/api/notifications";

export interface MenuItem {
  label: string;
  to: string;
  icon: ReactNode;
  end?: boolean;
  badge?: (s: AttentionSummary) => number;
}
export interface MenuSection {
  title: string;
  items: MenuItem[];
}

const i = (C: typeof LayoutDashboard) => <C size={18} />;

export const menu: MenuSection[] = [
  { title: "Overview", items: [{ label: "Dashboard", to: "/", icon: i(LayoutDashboard), end: true }] },
  {
    title: "Sales",
    items: [
      { label: "Orders", to: "/orders", icon: i(ShoppingBag), end: true, badge: (s) => s.pendingOrders },
      { label: "Create order", to: "/orders/new", icon: i(PlusCircle) },
      { label: "Returns", to: "/returns", icon: i(RotateCcw), badge: (s) => s.pendingReturns },
      { label: "Customers", to: "/customers", icon: i(Users) },
    ],
  },
  {
    title: "Catalog",
    items: [
      { label: "Products", to: "/products", icon: i(Boxes), end: true },
      { label: "Add product", to: "/products/new", icon: i(PackagePlus) },
      { label: "Inventory", to: "/inventory", icon: i(Warehouse), badge: (s) => s.lowStockItems + s.outOfStockItems },
      { label: "Categories", to: "/categories", icon: i(FolderTree) },
      { label: "Brands", to: "/brands", icon: i(Handshake) },
      { label: "Media library", to: "/media", icon: i(Images) },
    ],
  },
  {
    title: "Marketing",
    items: [
      { label: "Coupons", to: "/coupons", icon: i(TicketPercent) },
      { label: "Banners", to: "/banners", icon: i(GalleryHorizontal) },
      { label: "Back in stock", to: "/back-in-stock", icon: i(BellRing) },
    ],
  },
  {
    title: "Customer care",
    items: [
      { label: "Reviews", to: "/reviews", icon: i(Star) },
      { label: "Questions", to: "/questions", icon: i(MessageCircleQuestion), badge: (s) => s.unansweredQuestions },
      { label: "Support tickets", to: "/support", icon: i(LifeBuoy), badge: (s) => s.openTickets },
      { label: "Contact messages", to: "/contact", icon: i(Mail), badge: (s) => s.newContactMessages },
      { label: "Newsletter", to: "/newsletter", icon: i(Newspaper) },
    ],
  },
  { title: "Insights", items: [{ label: "Reports", to: "/reports", icon: i(BarChart3) }] },
  {
    title: "System",
    items: [
      { label: "Notifications", to: "/notifications", icon: i(Bell), badge: (s) => s.unreadNotifications },
      { label: "Settings", to: "/settings", icon: i(Settings) },
      { label: "Activity log", to: "/activity", icon: i(History) },
      { label: "Audit log", to: "/audit", icon: i(ShieldCheck) },
      { label: "My profile", to: "/profile", icon: i(UserCircle) },
    ],
  },
];
