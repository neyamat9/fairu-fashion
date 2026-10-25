import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, LayoutGrid, Minus, PackageSearch, Plus, Printer, ReceiptText, ShoppingCart, Store, Trash2, Truck, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { Field } from "@/components/shared/Field";
import { LocationSelect, type LocationValue } from "@/components/shared/LocationSelect";
import { CustomerPicker } from "@/components/shared/CustomerPicker";
import { SearchInput } from "@/components/shared/FilterBar";
import { LoadMore } from "@/components/shared/DataTable";
import { Thumb } from "@/components/shared/Thumb";
import { categoriesApi } from "@/api/catalog";
import { productsApi, type ProductDetail, type ProductRow } from "@/api/products";
import { ordersApi, type OrderDetail, type PaymentMethod } from "@/api/orders";
import { customersApi, type CustomerRow } from "@/api/users";
import { errorMessage, openHtml } from "@/api/client";
import { ScrollRow } from "@/components/shared/ScrollRow";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { money } from "@/lib/format";

interface Line {
  key: string;
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  image?: string | null;
  quantity: number;
  price: string;
  stock: number;
}

const BD_PHONE = /^(\+?88)?01[3-9]\d{8}$/;
const num = (v: string) => (v === "" ? 0 : Number(v));

export default function OrderCreatePage() {
  const nav = useNavigate();
  const qc = useQueryClient();

  // ---- catalogue ----
  const [cat, setCat] = useState("");
  const [search, setSearch] = useState("");
  const cats = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });
  const products = useInfiniteList(["pos-products", cat, search], (page) => productsApi.list({ categoryId: cat || undefined, search: search || undefined, status: "ACTIVE", limit: 24, page }));
  const [variantFor, setVariantFor] = useState<ProductDetail | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  // ---- the sale ----
  const [lines, setLines] = useState<Line[]>([]);
  const [walkIn, setWalkIn] = useState(false);
  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [postal, setPostal] = useState("");
  const [loc, setLoc] = useState<LocationValue>({ division: "", district: "", upazila: "" });
  const [method, setMethod] = useState<PaymentMethod>("CASH_ON_DELIVERY");
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState("");
  const [shipOverride, setShipOverride] = useState<string | null>(null);
  const [paid, setPaid] = useState("");
  const [txn, setTxn] = useState("");
  const [status, setStatus] = useState<"PENDING" | "CONFIRMED">("CONFIRMED");
  const [deliverNow, setDeliverNow] = useState(true);
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [done, setDone] = useState<OrderDetail | null>(null);

  const subtotal = lines.reduce((s, l) => s + num(l.price) * l.quantity, 0);
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
  const setLine = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  // delivery charge follows the shipping settings (zone by district, free-shipping rules) until the admin types their own
  const subtotalKey = useDebounce(subtotal, 300);
  const productIds = useMemo(() => [...new Set(lines.map((l) => l.productId))].sort(), [lines]);
  const quote = useQuery({
    queryKey: ["ship-quote", subtotalKey, loc.district, productIds.join(",")],
    queryFn: () => ordersApi.shippingQuote({ subtotal: subtotalKey, district: loc.district || undefined, productIds }),
    enabled: !walkIn && lines.length > 0,
    placeholderData: (p) => p,
  });
  const shipAuto = walkIn ? 0 : (quote.data?.cost ?? 0);
  const shipping = walkIn ? 0 : shipOverride !== null ? num(shipOverride) : shipAuto;
  const manualDiscount = coupon.trim() ? 0 : num(discount);
  const total = Math.max(0, subtotal - Math.min(manualDiscount, subtotal)) + shipping;
  const due = Math.max(0, total - num(paid));

  // pick up a customer's saved details
  const pickCustomer = async (c: CustomerRow) => {
    setCustomer(c);
    setName(c.name);
    setPhone(c.phone ?? "");
    try {
      const list = await customersApi.addresses(c.id);
      const a = list.find((x) => x.isDefault) ?? list[0];
      if (a) {
        setName(a.fullName || c.name);
        setPhone(a.phone || c.phone || "");
        setAddress(a.line1);
        setLoc({ division: a.division ?? "", district: a.district ?? "", upazila: a.upazila ?? "" });
        setShipOverride(null);
      }
    } catch {
      /* the customer simply has no saved address */
    }
  };

  const addProduct = async (p: ProductRow) => {
    if (p._count.variants > 0) {
      setOpening(p.id);
      try {
        setVariantFor(await productsApi.get(p.id));
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setOpening(null);
      }
      return;
    }
    if (p.stock <= 0) return toast.error(`${p.name} is out of stock`);
    addLine({ key: p.id, productId: p.id, name: p.name, image: p.mainImage, price: String(Number(p.sellingPrice)), stock: p.stock, quantity: 1 });
  };
  const addLine = (l: Line) =>
    setLines((ls) => {
      const have = ls.find((x) => x.key === l.key);
      if (!have) return [...ls, l];
      if (have.quantity >= have.stock) {
        toast.error(`Only ${have.stock} of ${have.name} in stock`);
        return ls;
      }
      return ls.map((x) => (x.key === l.key ? { ...x, quantity: x.quantity + 1 } : x));
    });
  const qtyIn = (id: string, variantId?: string) => lines.find((l) => l.key === (variantId ?? id))?.quantity ?? 0;

  const reset = () => {
    setLines([]); setWalkIn(false); setCustomer(null); setName(""); setPhone(""); setEmail(""); setAddress(""); setPostal("");
    setLoc({ division: "", district: "", upazila: "" }); setMethod("CASH_ON_DELIVERY"); setCoupon(""); setDiscount(""); setShipOverride(null);
    setPaid(""); setTxn(""); setStatus("CONFIRMED"); setDeliverNow(true); setNote(""); setNotify(true); setErr(null); setDone(null); setCartOpen(false);
  };

  const create = useMutation({
    mutationFn: async () => {
      const o = await ordersApi.create({
        walkIn: walkIn || undefined,
        walkInName: walkIn && name.trim() ? name.trim() : undefined,
        walkInPhone: walkIn && phone.trim() ? phone.trim() : undefined,
        customer: customer ? { userId: customer.id } : !walkIn && email ? { email } : undefined,
        shippingAddress: walkIn
          ? undefined
          : { fullName: name.trim(), phone: phone.trim(), address: address.trim(), postalCode: postal || undefined, division: loc.division || undefined, district: loc.district || undefined, upazila: loc.upazila || undefined },
        items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity, price: Number(l.price) })),
        paymentMethod: method,
        couponCode: coupon.trim() || undefined,
        discountAmount: !coupon.trim() && discount !== "" ? Number(discount) : undefined,
        shippingCost: walkIn ? 0 : shipOverride !== null && shipOverride !== "" ? Number(shipOverride) : undefined,
        amountPaid: paid !== "" && Number(paid) > 0 ? Number(paid) : undefined,
        transactionId: txn || undefined,
        status: walkIn ? "CONFIRMED" : status,
        internalNote: note || undefined,
        notifyCustomer: walkIn ? false : notify,
      });
      if (walkIn && deliverNow) {
        try {
          await ordersApi.setStatus(o.id, "DELIVERED", "Handed over at the counter");
        } catch {
          toast.warning("The sale was saved but could not be marked as delivered");
        }
      }
      return o;
    },
    onSuccess: (o) => {
      void qc.invalidateQueries({ queryKey: ["orders"] });
      void qc.invalidateQueries({ queryKey: ["pos-products"] });
      void qc.invalidateQueries({ queryKey: ["dashboard-home"] });
      void qc.invalidateQueries({ queryKey: ["attention-summary"] });
      setDone(o);
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  const submit = () => {
    if (lines.length === 0) return setErr("Add at least one product");
    if (lines.some((l) => !(l.quantity >= 1) || l.price === "" || Number(l.price) < 0)) return setErr("Check the quantity and price of each item");
    if (walkIn) {
      if (phone.trim() && !BD_PHONE.test(phone.replace(/[\s-]/g, ""))) return setErr("Enter a valid Bangladesh mobile number, or leave it empty");
    } else {
      if (!name.trim() || !address.trim()) return setErr("Name and address are required for delivery");
      if (!BD_PHONE.test(phone.replace(/[\s-]/g, ""))) return setErr("Enter a valid Bangladesh mobile number");
      if (!loc.district) return setErr("Choose a district");
    }
    if (num(paid) > total) return setErr("The amount paid is more than the total");
    setErr(null);
    create.mutate();
  };

  // phone: keep the page behind the sale sheet from scrolling
  useEffect(() => {
    if (!cartOpen) return;
    const main = document.querySelector("main");
    const prev = main?.style.overflow;
    if (main) main.style.overflow = "hidden";
    return () => {
      if (main) main.style.overflow = prev ?? "";
    };
  }, [cartOpen]);

  // on a big screen the product list scrolls inside its own column; on a phone the page scrolls
  const [catEl, setCatEl] = useState<HTMLDivElement | null>(null);
  const isDesktop = useIsDesktop();
  const rootEl = isDesktop ? catEl : typeof document !== "undefined" ? document.querySelector("main") : null;

  const panel = (
    <div className="flex flex-col gap-3 p-0.5">
      {/* customer */}
      <section className="rounded border border-border bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold"><UserRound className="size-4 text-muted-foreground" /> Customer</h3>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium">
            <Checkbox
              checked={walkIn}
              onChange={(e) => {
                setWalkIn(e.target.checked);
                if (e.target.checked) { setCustomer(null); setShipOverride(null); setMethod("CASH_ON_DELIVERY"); }
              }}
            />
            <Store className="size-3.5 text-muted-foreground" /> Walk-in customer
          </label>
        </div>
        <div className="space-y-2.5 p-3">
          {walkIn ? (
            <>
              <p className="rounded bg-accent px-2.5 py-1.5 text-[12px] text-accent-foreground">Sold over the counter: no delivery and no delivery charge.</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Name (optional)"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Walk-in customer" /></Field>
                <Field label="Phone (optional)"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" /></Field>
              </div>
            </>
          ) : customer ? (
            <div className="flex items-start justify-between gap-2 rounded border border-border bg-muted/40 p-2.5">
              <div className="min-w-0 text-[13px]">
                <p className="truncate font-semibold">{customer.name}</p>
                <p className="truncate text-xs text-muted-foreground">{customer.phone ? `${customer.phone} · ` : ""}{customer.email}</p>
              </div>
              <Button size="icon-xs" variant="ghost" aria-label="Choose another customer" onClick={() => { setCustomer(null); setName(""); setPhone(""); setAddress(""); setLoc({ division: "", district: "", upazila: "" }); }}><X /></Button>
            </div>
          ) : (
            <CustomerPicker onPick={(c) => void pickCustomer(c)} />
          )}

        </div>
      </section>

      {/* the sale */}
      <section className="rounded border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold"><ShoppingCart className="size-4 text-muted-foreground" /> Sale <span className="rounded bg-brand px-1.5 text-[10px] font-bold leading-4 text-brand-foreground">{itemCount}</span></h3>
          {lines.length > 0 && <button type="button" onClick={() => setLines([])} className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-destructive">Clear</button>}
        </div>
        {lines.length === 0 ? (
          <div className="flex flex-col items-center gap-1 px-4 py-8 text-center text-muted-foreground">
            <PackageSearch className="size-8 opacity-50" />
            <p className="text-sm font-medium text-foreground">No products yet</p>
            <p className="text-xs">Tap a product to add it to the sale.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {lines.map((l) => (
              <li key={l.key} className="row-enter flex items-center gap-2.5 p-2.5">
                <Thumb src={l.image} className="size-11 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[13px] font-medium leading-snug">{l.name}</p>
                  {l.variantName && <p className="truncate text-[11px] text-muted-foreground">{l.variantName}</p>}
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex items-center rounded border border-input">
                      <button type="button" aria-label="Less" onClick={() => (l.quantity <= 1 ? setLines((ls) => ls.filter((x) => x.key !== l.key)) : setLine(l.key, { quantity: l.quantity - 1 }))} className="flex size-7 cursor-pointer items-center justify-center hover:bg-muted"><Minus className="size-3.5" /></button>
                      <input
                        aria-label="Quantity"
                        value={l.quantity}
                        inputMode="numeric"
                        onChange={(e) => setLine(l.key, { quantity: Math.min(l.stock, Math.max(1, Math.floor(Number(e.target.value.replace(/\D/g, "")) || 1))) })}
                        className="h-7 w-9 border-x border-input bg-card text-center text-[13px] outline-none"
                      />
                      <button type="button" aria-label="More" disabled={l.quantity >= l.stock} onClick={() => setLine(l.key, { quantity: l.quantity + 1 })} className="flex size-7 cursor-pointer items-center justify-center hover:bg-muted disabled:opacity-40"><Plus className="size-3.5" /></button>
                    </div>
                    <span className="text-xs text-muted-foreground">×</span>
                    <input
                      aria-label="Unit price"
                      value={l.price}
                      inputMode="decimal"
                      onChange={(e) => setLine(l.key, { price: e.target.value.replace(/[^\d.]/g, "") })}
                      className="h-7 w-18 rounded border border-input bg-card px-1.5 text-[13px] outline-none focus:border-ring"
                    />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[13px] font-semibold">{money(num(l.price) * l.quantity)}</span>
                  <button type="button" aria-label="Remove" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="cursor-pointer text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* delivery details (not for walk-in) */}
      {!walkIn && (
        <section className="rounded border border-border bg-card">
          <div className="flex items-center gap-1.5 border-b border-border px-3 py-2.5">
            <Truck className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Delivery details</h3>
          </div>
          <div className="space-y-2.5 p-3">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Full name" required><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
                <Field label="Phone" required><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" /></Field>
              </div>
              <Field label="Address" required><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House, road, area" /></Field>
              <LocationSelect value={loc} onChange={(v) => { setLoc(v); setShipOverride(null); }} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Postal code"><Input value={postal} onChange={(e) => setPostal(e.target.value)} /></Field>
                {!customer && <Field label="Email (optional)"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>}
              </div>
          </div>
        </section>
      )}

      {/* totals & payment */}
      <section className="rounded border border-border bg-card">
        <div className="space-y-3 p-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Coupon"><Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Code" /></Field>
            <Field label="Discount ৳"><Input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} disabled={!!coupon.trim()} /></Field>
          </div>

          <dl className="space-y-1.5 text-[13px]">
            <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-medium">{money(subtotal)}</dd></div>
            {manualDiscount > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Discount</dt><dd className="font-medium text-success">− {money(Math.min(manualDiscount, subtotal))}</dd></div>}
            {coupon.trim() && <div className="flex justify-between"><dt className="text-muted-foreground">Coupon {coupon}</dt><dd className="text-xs text-muted-foreground">applied when you create</dd></div>}
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-muted-foreground"><Truck className="size-3.5" /> Delivery{!walkIn && quote.data && <span className="text-[11px]">({quote.data.zoneLabel})</span>}</dt>
              <dd className="flex items-center gap-2">
                {walkIn ? (
                  <span className="font-medium">{money(0)} <span className="text-[11px] font-normal text-muted-foreground">no delivery</span></span>
                ) : (
                  <>
                    {shipOverride !== null && <button type="button" onClick={() => setShipOverride(null)} className="cursor-pointer text-[11px] font-medium text-primary hover:underline dark:text-orange-400">Auto {money(shipAuto)} · reset</button>}
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">৳</span>
                      <Input aria-label="Delivery charge" type="number" min={0} value={shipOverride ?? String(shipAuto)} onChange={(e) => setShipOverride(e.target.value)} className="h-8 w-24 pl-5 text-right" />
                    </div>
                  </>
                )}
              </dd>
            </div>
            {!walkIn && !loc.district && lines.length > 0 && <p className="text-[11px] text-muted-foreground">Choose the district for the exact delivery charge.</p>}
            {!walkIn && quote.data?.isFree && lines.length > 0 && <p className="text-[11px] font-medium text-success">Free delivery applies.</p>}
            {!walkIn && quote.data?.amountForFreeShipping != null && quote.data.amountForFreeShipping > 0 && <p className="text-[11px] text-muted-foreground">Add {money(quote.data.amountForFreeShipping)} more for free delivery.</p>}
            <div className="flex items-baseline justify-between border-t border-border pt-2 text-base">
              <dt className="font-semibold">Total</dt>
              <dd className="font-heading text-lg font-bold">{money(total)}</dd>
            </div>
          </dl>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Payment method">
              <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                <option value="CASH_ON_DELIVERY">{walkIn ? "Cash" : "Cash on delivery"}</option>
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
                <option value="ROCKET">Rocket</option>
              </Select>
            </Field>
            <Field label="Paid now ৳">
              <div className="flex gap-1">
                <Input type="number" min={0} value={paid} onChange={(e) => setPaid(e.target.value)} />
                <Button type="button" size="sm" variant="outline" className="h-9 shrink-0 px-2 text-xs" disabled={total <= 0} onClick={() => setPaid(String(total))}>Full</Button>
              </div>
            </Field>
          </div>
          {num(paid) > 0 && method !== "CASH_ON_DELIVERY" && <Field label="Transaction ID"><Input value={txn} onChange={(e) => setTxn(e.target.value)} /></Field>}
          {num(paid) > 0 && <p className="text-xs text-muted-foreground">Due: <b className="text-foreground">{money(due)}</b></p>}

          {walkIn ? (
            <label className="flex cursor-pointer items-center gap-2 text-[13px]"><Checkbox checked={deliverNow} onChange={(e) => setDeliverNow(e.target.checked)} /> Handed over now (mark as delivered)</label>
          ) : (
            <>
              <Field label="Starting status">
                <Select value={status} onChange={(e) => setStatus(e.target.value as "PENDING" | "CONFIRMED")}>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PENDING">Pending</option>
                </Select>
              </Field>
              <label className="flex cursor-pointer items-center gap-2 text-[13px]"><Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Email the customer</label>
            </>
          )}
          <Field label="Internal note"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} className="min-h-14" /></Field>

        </div>
      </section>
    </div>
  );

  // always visible under the sale panel, whatever is scrolled: the total and the button that finishes the sale
  const footer = (
    <div className="shrink-0 space-y-2 border-t border-border bg-card p-3 shadow-[0_-6px_14px_-8px_rgba(11,27,51,0.25)]">
      {err && <p className="rounded bg-red-50 px-3 py-2 text-[13px] font-medium text-destructive dark:bg-red-500/10" role="alert">{err}</p>}
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{itemCount} item{itemCount === 1 ? "" : "s"}{!walkIn && shipping > 0 ? ` + ${money(shipping)} delivery` : ""}</span>
        <span className="font-heading text-lg font-bold">{money(total)}</span>
      </div>
      <Button className="h-11 w-full text-[15px]" variant="brand" loading={create.isPending} disabled={lines.length === 0} onClick={submit}>
        <ReceiptText /> {walkIn ? "Complete sale" : "Create order"}
      </Button>
    </div>
  );

  return (
    <div className="lg:flex lg:h-[calc(100dvh-5.5rem)] lg:flex-col">
      <div className="lg:shrink-0">
        <PageHeader back={{ to: "/orders", label: "Orders" }} title="New sale" description="Pick products, choose the customer (or walk-in), and complete the sale. Stock is reduced straight away." />
      </div>

      {/* phones: as soon as something is in the sale, the button is at the top, always in reach */}
      {lines.length > 0 && !cartOpen && (
        <div className="row-enter sticky top-0 z-20 -mx-3 mb-3 flex items-center justify-between gap-3 border-b border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur sm:-mx-4 sm:px-4 lg:hidden">
          <div className="min-w-0 leading-tight">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold"><ShoppingCart className="size-4 text-muted-foreground" /> {itemCount} item{itemCount === 1 ? "" : "s"}</p>
            <p className="text-xs text-muted-foreground">{money(total)}</p>
          </div>
          <Button variant="brand" className="shrink-0" onClick={() => setCartOpen(true)}><ReceiptText /> Create order</Button>
        </div>
      )}

      <div className="grid items-start gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[minmax(0,1fr)] lg:items-stretch xl:grid-cols-[minmax(0,1fr)_430px]">
        {/* ---------- catalogue ---------- */}
        <div ref={setCatEl} className="min-w-0 space-y-3 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <div className="rounded border border-border bg-card p-3 lg:sticky lg:top-0 lg:z-10">
            <SearchInput value={search} onChange={setSearch} placeholder="Search products by name, code or SKU…" className="max-w-none basis-full sm:max-w-none" />
            <ScrollRow className="mt-2" activeKey={cat}>
              {[{ id: "", name: "All products" }, ...(cats.data ?? []).filter((c) => c.status === "ACTIVE").map((c) => ({ id: c.id, name: c.name }))].map((c) => (
                <button
                  key={c.id || "all"}
                  type="button"
                  data-active={cat === c.id}
                  aria-pressed={cat === c.id}
                  onClick={() => setCat(c.id)}
                  className={cn(
                    "flex shrink-0 cursor-pointer items-center gap-1.5 rounded border px-3 py-1.5 text-[13px] font-medium transition-colors",
                    cat === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-ring hover:text-foreground",
                  )}
                >
                  {c.id === "" && <LayoutGrid className="size-3.5" />}
                  {c.name}
                </button>
              ))}
              {cats.isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-24 shrink-0" />)}
            </ScrollRow>
          </div>

          {products.isLoading ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded border border-border bg-card">
                  <Skeleton className="aspect-square w-full rounded-none" />
                  <div className="space-y-1.5 p-2.5"><Skeleton className="h-3.5 w-full" /><Skeleton className="h-3.5 w-2/3" /></div>
                </div>
              ))}
            </div>
          ) : products.rows.length === 0 ? (
            <div className="rounded border border-dashed border-border bg-card px-4 py-14 text-center text-sm text-muted-foreground">No products found{search ? ` for “${search}”` : ""}.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {products.rows.map((p) => {
                const inSale = p._count.variants ? lines.filter((l) => l.productId === p.id).reduce((s, l) => s + l.quantity, 0) : qtyIn(p.id);
                const out = p._count.variants === 0 && p.stock <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={out || opening === p.id}
                    onClick={() => void addProduct(p)}
                    className={cn(
                      "group relative flex cursor-pointer flex-col overflow-hidden rounded border bg-card text-left transition-all hover:-translate-y-0.5 hover:border-ring hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:shadow-none",
                      inSale > 0 ? "border-primary ring-1 ring-primary" : "border-border",
                    )}
                  >
                    <div className="relative aspect-square w-full bg-muted">
                      <Thumb src={p.mainImage} alt={p.name} className="size-full rounded-none border-0" />
                      {inSale > 0 && <span className="absolute right-1.5 top-1.5 flex min-w-6 items-center justify-center rounded bg-primary px-1.5 text-[11px] font-bold leading-6 text-primary-foreground shadow">{inSale}</span>}
                      {out && <span className="absolute inset-x-0 bottom-0 bg-destructive/90 py-0.5 text-center text-[10px] font-bold uppercase text-white">Out of stock</span>}
                      {p._count.variants > 0 && <span className="absolute left-1.5 top-1.5 rounded bg-card/90 px-1.5 py-0.5 text-[10px] font-semibold shadow-sm">{p._count.variants} options</span>}
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5 p-2.5">
                      <p className="line-clamp-2 min-h-[2.4em] text-[13px] font-medium leading-snug">{p.name}</p>
                      <p className="mt-auto pt-1 text-sm font-bold text-primary dark:text-orange-400">{money(p.sellingPrice)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {products.rows.length > 0 && (
            <>
              <LoadMore list={products} root={rootEl} />
              <p className="py-2 text-center text-xs text-muted-foreground">
                {products.isFetchingNextPage ? "Loading more…" : products.hasNextPage ? `Showing ${products.rows.length} of ${products.total}` : `All ${products.total} shown`}
              </p>
            </>
          )}
        </div>

        {/* ---------- sale panel (desktop: its own column · phone: a sheet that slides up) ---------- */}
        <aside
          aria-hidden={!cartOpen && !isDesktop}
          className={cn(
            "flex min-h-0 flex-col lg:overflow-hidden lg:rounded lg:border lg:border-border lg:bg-background",
            "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:top-14 max-lg:z-40 max-lg:bg-background max-lg:shadow-2xl max-lg:transition-[translate,transform,visibility] max-lg:duration-300 max-lg:ease-[cubic-bezier(0.22,1,0.36,1)]",
            cartOpen ? "max-lg:visible max-lg:translate-y-0" : "max-lg:invisible max-lg:translate-y-full",
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-3 py-2 lg:hidden">
            <h2 className="font-heading text-base font-bold">Sale · {money(total)}</h2>
            <Button size="sm" variant="outline" onClick={() => setCartOpen(false)}><X /> Close</Button>
          </div>
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">{panel}</div>
          {footer}
        </aside>
      </div>

      {/* variant chooser */}
      <Dialog open={!!variantFor} onOpenChange={(o) => !o && setVariantFor(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Choose an option</DialogTitle>
            <DialogDescription>{variantFor?.name}</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-2">
            {variantFor?.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={v.stock <= 0}
                onClick={() => {
                  addLine({ key: v.id, productId: variantFor.id, variantId: v.id, name: variantFor.name, variantName: v.name, image: v.imageUrl ?? variantFor.images[0]?.url ?? null, price: String(Number(v.price ?? variantFor.sellingPrice)), stock: v.stock, quantity: 1 });
                  setVariantFor(null);
                }}
                className="flex cursor-pointer items-center justify-between gap-3 rounded border border-border px-3 py-2.5 text-left transition-colors hover:border-ring hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="min-w-0"><span className="block truncate text-sm font-medium">{v.name}</span><span className="text-[11px] text-muted-foreground">{v.stock > 0 ? `${v.stock} in stock` : "Out of stock"}</span></span>
                <span className="shrink-0 text-sm font-bold">{money(v.price ?? variantFor.sellingPrice)}</span>
              </button>
            ))}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* sale done */}
      <Dialog open={!!done} onOpenChange={() => undefined}>
        <DialogContent size="sm" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader className="items-center text-center">
            <CheckCircle2 className="size-12 text-success" />
            <DialogTitle>{walkIn ? "Sale complete" : "Order created"}</DialogTitle>
            <DialogDescription>
              <b className="text-foreground">{done?.orderNumber}</b> · {money(done?.total ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full" onClick={() => done && openHtml(`/admin/orders/${done.id}/invoice`).catch((e) => toast.error(errorMessage(e)))}><Printer /> Print receipt</Button>
            <Button className="w-full" variant="brand" onClick={reset}><Plus /> New sale</Button>
            <Button className="w-full" variant="ghost" onClick={() => done && nav(`/orders/${done.id}`)}>View order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
