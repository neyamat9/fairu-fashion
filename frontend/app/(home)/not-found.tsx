import NotFoundView from "@/components/layout/NotFoundView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — Page Not Found",
  description: "The page you're looking for doesn't exist. Navigate back to Fairu Fashion.",
};

export default function HomeNotFound() {
  return <NotFoundView />;
}
