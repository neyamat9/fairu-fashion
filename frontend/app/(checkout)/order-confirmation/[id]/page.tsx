import { redirect } from "next/navigation";

// The thank-you now lives on the order page itself.
export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/orders/${id}?placed=1`);
}
