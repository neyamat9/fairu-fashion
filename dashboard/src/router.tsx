import type { ReactNode } from "react";
import { createBrowserRouter } from "react-router";
import AdminLayout from "@/components/layout/AdminLayout";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/shared/AuthGuard";
import { L } from "@/components/shared/LazyPage";
import NotFound from "@/pages/NotFound";
import { AuthLayout } from "@/pages/auth/AuthShell";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import Login from "@/pages/auth/Login";
import ResetPassword from "@/pages/auth/ResetPassword";
import {
  CardListSkeleton,
  DetailPageSkeleton,
  FeedPageSkeleton,
  GridPageSkeleton,
  ListPageSkeleton,
  ReportsSkeleton,
} from "@/components/shared/skeletons";
import {
  BackInStockSkeleton,
  ContactSkeleton,
  CouponsSkeleton,
  CustomersSkeleton,
  DashboardSkeleton,
  InventorySkeleton,
  NewsletterSkeleton,
  OrdersSkeleton,
  PosSkeleton,
  ProductEditorSkeleton,
  ProductsSkeleton,
  ProfileSkeleton,
  QuestionsSkeleton,
  ReturnsSkeleton,
  ReviewsSkeleton,
  SettingsSkeleton,
  SupportSkeleton,
} from "@/components/shared/pageSkeletons";

const wrap = (el: ReactNode) => el;

export const router = createBrowserRouter([
  {
    // one frame for all three sign-in screens: it stays put while the form swaps
    element: <AuthLayout />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: "/login", element: <Login /> },
          { path: "/forgot-password", element: <ForgotPassword /> },
        ],
      },
      { path: "/reset-password", element: <ResetPassword /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: L(() => import("@/pages/dashboard/Dashboard"), <DashboardSkeleton />) },
          { path: "orders", element: L(() => import("@/pages/orders/OrdersList"), <OrdersSkeleton />) },
          { path: "orders/new", element: L(() => import("@/pages/orders/OrderCreate"), <PosSkeleton />) },
          { path: "orders/:id", element: L(() => import("@/pages/orders/OrderDetail"), <DetailPageSkeleton />) },
          { path: "products", element: L(() => import("@/pages/products/ProductsList"), <ProductsSkeleton />) },
          { path: "products/new", element: L(() => import("@/pages/products/ProductEditor"), <ProductEditorSkeleton isNew />) },
          { path: "products/:id/edit", element: L(() => import("@/pages/products/ProductEditor"), <ProductEditorSkeleton />) },
          { path: "inventory", element: L(() => import("@/pages/inventory/Inventory"), <InventorySkeleton />) },
          { path: "categories", element: L(() => import("@/pages/catalog/Categories"), <CardListSkeleton title="Categories" text="Drag to change the order shown on the website." action="New category" />) },
          { path: "brands", element: L(() => import("@/pages/catalog/Brands"), <CardListSkeleton title="Brands" text="Drag to change the order shown on the website." action="New brand" />) },
          { path: "banners", element: L(() => import("@/pages/catalog/Banners"), <CardListSkeleton title="Banners" text="Home page sliders and promotions. Drag inside a group to change the order." action="New banner" />) },
          { path: "media", element: L(() => import("@/pages/catalog/Media"), <GridPageSkeleton />) },
          { path: "customers", element: L(() => import("@/pages/customers/CustomersList"), <CustomersSkeleton />) },
          { path: "customers/:id", element: L(() => import("@/pages/customers/CustomerDetail"), <DetailPageSkeleton />) },
          { path: "coupons", element: L(() => import("@/pages/coupons/Coupons"), <CouponsSkeleton />) },
          { path: "reviews", element: L(() => import("@/pages/care/Reviews"), <ReviewsSkeleton />) },
          { path: "questions", element: L(() => import("@/pages/care/Questions"), <QuestionsSkeleton />) },
          { path: "returns", element: L(() => import("@/pages/care/Returns"), <ReturnsSkeleton />) },
          { path: "support", element: L(() => import("@/pages/care/Support"), <SupportSkeleton />) },
          { path: "support/:id", element: L(() => import("@/pages/care/SupportDetail"), <DetailPageSkeleton />) },
          { path: "contact", element: L(() => import("@/pages/care/Contact"), <ContactSkeleton />) },
          { path: "newsletter", element: L(() => import("@/pages/care/Newsletter"), <NewsletterSkeleton />) },
          { path: "back-in-stock", element: L(() => import("@/pages/care/BackInStock"), <BackInStockSkeleton />) },
          { path: "reports", element: L(() => import("@/pages/reports/Reports"), <ReportsSkeleton />) },
          { path: "settings", element: L(() => import("@/pages/settings/Settings"), <SettingsSkeleton />) },
          { path: "profile", element: L(() => import("@/pages/account/Profile"), <ProfileSkeleton />) },
          { path: "notifications", element: L(() => import("@/pages/logs/Notifications"), <FeedPageSkeleton />) },
          { path: "activity", element: L(() => import("@/pages/logs/ActivityLog"), <ListPageSkeleton stats={4} actions={1} filters={3} cols={5} />) },
          { path: "audit", element: L(() => import("@/pages/logs/AuditLog"), <ListPageSkeleton actions={1} filters={3} cols={5} />) },
          { path: "*", element: wrap(<NotFound />) },
        ],
      },
    ],
  },
]);
