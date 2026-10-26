import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Check, Image as ImageIcon, Loader2, Mail, Plus, Trash2 } from "lucide-react";
import { settingsApi, type Settings as S, type SettingsGroup, type CraftedProductItem } from "@/api/system";
import { assetUrl, errorMessage } from "@/api/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Field, Section } from "@/components/shared/Field";
import { ImageField } from "@/components/shared/ImageField";
import { ErrorState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Switch, Textarea } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductPicker } from "@/components/shared/ProductPicker";
import { productsApi, type ProductDetail } from "@/api/products";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { useAct } from "@/hooks/useAct";
import { useUrlState } from "@/hooks/useUrlState";
import { SettingsSkeleton } from "@/components/shared/pageSkeletons";

const nz = (v: string | null | undefined) => (!v || v.trim() === "" ? null : v.trim());
const Toggle = ({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
    <span><span className="block text-[13px] font-medium">{label}</span>{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}</span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </label>
);

function useSave(group: SettingsGroup) {
  return useAct((body: Record<string, unknown>) => settingsApi.save(group, body), { success: "Settings saved", invalidate: [["settings"]] });
}

function SiteForm({ v }: { v: S["site"] }) {
  const [f, setF] = useState({ ...v, contactEmail: v.contactEmail ?? "", hotline: v.hotline ?? "", whatsapp: v.whatsapp ?? "", address: v.address ?? "", businessHours: v.businessHours ?? "", metaTitle: v.metaTitle ?? "", metaDescription: v.metaDescription ?? "" });
  const [social, setSocial] = useState<Record<string, string>>(v.socialLinks ?? {});
  const save = useSave("site");
  const submit = () => {
    if (!f.storeName.trim()) return toast.error("Store name is required");
    if (f.contactEmail && !/^\S+@\S+\.\S+$/.test(f.contactEmail)) return toast.error("Enter a valid contact email");
    save.mutate({ ...v, storeName: f.storeName.trim(), tagline: f.tagline, logoUrl: f.logoUrl, faviconUrl: f.faviconUrl, contactEmail: nz(f.contactEmail), hotline: nz(f.hotline), whatsapp: nz(f.whatsapp), address: nz(f.address), businessHours: nz(f.businessHours), currency: f.currency, currencySymbol: f.currencySymbol, metaTitle: nz(f.metaTitle), metaDescription: nz(f.metaDescription), socialLinks: Object.fromEntries(Object.entries(social).filter(([, x]) => x.trim())) });
  };
  return (
    <div className="grid items-start gap-4 xl:grid-cols-2 [&>button]:justify-self-start xl:[&>button]:col-span-2">
      <Section title="Store">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Store name" required><Input value={f.storeName} onChange={(e) => setF({ ...f, storeName: e.target.value })} /></Field><Field label="Tagline"><Input value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} /></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><ImageField label="Logo" folder="site" value={f.logoUrl} onChange={(logoUrl) => setF({ ...f, logoUrl })} /><ImageField label="Favicon" folder="site" value={f.faviconUrl} onChange={(faviconUrl) => setF({ ...f, faviconUrl })} /></div>
        </div>
      </Section>
      <Section title="Contact">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Contact email"><Input type="email" value={f.contactEmail} onChange={(e) => setF({ ...f, contactEmail: e.target.value })} /></Field>
          <Field label="Hotline"><Input value={f.hotline} onChange={(e) => setF({ ...f, hotline: e.target.value })} /></Field>
          <Field label="WhatsApp"><Input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} /></Field>
          <Field label="Business hours"><Input value={f.businessHours} onChange={(e) => setF({ ...f, businessHours: e.target.value })} placeholder="Sat–Thu, 10am–8pm" /></Field>
          <Field label="Address" className="sm:col-span-2"><Textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        </div>
      </Section>
      <Section title="Social links">
        <div className="grid gap-3 sm:grid-cols-2">{["facebook", "instagram", "youtube", "tiktok", "twitter", "linkedin"].map((k) => <Field key={k} label={k[0].toUpperCase() + k.slice(1)}><Input value={social[k] ?? ""} onChange={(e) => setSocial({ ...social, [k]: e.target.value })} placeholder="https://" /></Field>)}</div>
      </Section>
      <Section title="Search engines">
        <div className="space-y-3"><Field label="Meta title"><Input value={f.metaTitle} onChange={(e) => setF({ ...f, metaTitle: e.target.value })} /></Field><Field label="Meta description"><Textarea rows={2} value={f.metaDescription} onChange={(e) => setF({ ...f, metaDescription: e.target.value })} /></Field></div>
      </Section>
      <Button loading={save.isPending} onClick={submit}>Save store settings</Button>
    </div>
  );
}

function HeroForm({ v }: { v: S["site"] }) {
  const [f, setF] = useState<{
    heroBgUrl: string | null;
    heroModels: string[];
    heroBadge: string;
    heroTitle: string;
    heroHighlight: string;
    heroDescription: string;
    heroButtonText: string;
    heroButtonLink: string;
    heroIntervalSeconds: number;
  }>({
    heroBgUrl: v.heroBgUrl ?? "/hero/hero-slide-1.webp",
    heroModels: v.heroModels && v.heroModels.length > 0 ? v.heroModels : ["/hero/hero-slide-1.webp", "/hero/hero-slide-2.webp", "/hero/hero-slide-3.webp"],
    heroBadge: v.heroBadge ?? "TIMELESS ELEGANCE",
    heroTitle: v.heroTitle ?? "Grace in Every",
    heroHighlight: v.heroHighlight ?? "Three Piece",
    heroDescription: v.heroDescription ?? "Discover our exclusive collection of women's three piece outfits — crafted for your everyday grace and special moments.",
    heroButtonText: v.heroButtonText ?? "Shop Now",
    heroButtonLink: v.heroButtonLink ?? "/category/three-piece",
    heroIntervalSeconds: v.heroIntervalSeconds ?? 5,
  });
  const [addUrl, setAddUrl] = useState("");
  const save = useSave("site");

  const addModel = (url: string | null) => {
    if (!url) return;
    setF((prev) => ({ ...prev, heroModels: [...prev.heroModels, url] }));
  };

  const removeModel = (idx: number) => {
    if (f.heroModels.length <= 1) {
      return toast.error("Keep at least one hero slide image for the showcase");
    }
    setF((prev) => ({ ...prev, heroModels: prev.heroModels.filter((_, i) => i !== idx) }));
  };

  const moveModel = (from: number, to: number) => {
    if (to < 0 || to >= f.heroModels.length) return;
    const next = [...f.heroModels];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setF((prev) => ({ ...prev, heroModels: next }));
  };

  const submit = () => {
    save.mutate({
      ...v,
      heroBgUrl: nz(f.heroBgUrl),
      heroModels: f.heroModels,
      heroBadge: nz(f.heroBadge),
      heroTitle: nz(f.heroTitle),
      heroHighlight: nz(f.heroHighlight),
      heroDescription: nz(f.heroDescription),
      heroButtonText: nz(f.heroButtonText),
      heroButtonLink: nz(f.heroButtonLink),
      heroIntervalSeconds: Number(f.heroIntervalSeconds) || 5,
    });
  };

  return (
    <div className="grid items-start gap-4 xl:grid-cols-2 [&>button]:justify-self-start xl:[&>button]:col-span-2">
      <Section
        title="Hero Photo Slides (Model with Background Scene)"
        description="Full scene boutique photos with the model seated in the architectural archway. They cycle automatically every 5 seconds on the storefront with smooth crossfade animation."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {f.heroModels.map((m, idx) => (
              <div
                key={idx}
                className="group relative flex flex-col items-center justify-between overflow-hidden rounded-lg border border-border bg-muted/20 p-2.5 transition-all hover:border-brand-orange/50 hover:bg-muted/40"
              >
                <div className="flex w-full items-center justify-between pb-1 text-[11px] font-semibold text-muted-foreground">
                  <span>Slide #{idx + 1}</span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveModel(idx, idx - 1)}
                      className="rounded p-1 hover:bg-background disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === f.heroModels.length - 1}
                      onClick={() => moveModel(idx, idx + 1)}
                      className="rounded p-1 hover:bg-background disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeModel(idx)}
                      className="rounded p-1 text-destructive hover:bg-red-50 dark:hover:bg-red-950/30"
                      title="Remove"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                <div className="relative my-1 flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded border border-border/40 bg-muted">
                  <img
                    src={assetUrl(m)}
                    alt={`Hero Slide ${idx + 1}`}
                    className="size-full object-cover"
                  />
                </div>

                <p className="w-full truncate text-[11px] text-muted-foreground text-center font-mono" title={m}>
                  {m.split("/").pop()}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border/80 bg-background/50 p-3 space-y-2">
            <Label className="block text-xs font-semibold">Upload or Add New Hero Slide Photo</Label>
            <div className="flex flex-wrap items-center gap-3">
              <ImageField
                folder="banners"
                value=""
                onChange={(url) => {
                  if (url) addModel(url);
                }}
              />
              <div className="flex flex-1 items-center gap-2 min-w-[240px]">
                <Input
                  placeholder="Or enter image URL (e.g. /hero/hero-slide-1.webp)"
                  value={addUrl}
                  onChange={(e) => setAddUrl(e.target.value)}
                  className="text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!addUrl.trim()}
                  onClick={() => {
                    addModel(addUrl.trim());
                    setAddUrl("");
                  }}
                >
                  <Plus /> Add
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tip: Supports high-resolution WebP, JPG, and PNG images.
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="Wall Typography & Content"
        description="The luxury serif headline and details displayed as if written directly on the plaster wall."
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Subtitle / Badge" hint="e.g. TIMELESS ELEGANCE">
              <Input
                value={f.heroBadge}
                onChange={(e) => setF({ ...f, heroBadge: e.target.value })}
              />
            </Field>
            <Field label="Transition Speed (seconds)" hint="Default: 5 seconds">
              <Input
                type="number"
                min="2"
                max="30"
                value={f.heroIntervalSeconds}
                onChange={(e) => setF({ ...f, heroIntervalSeconds: Number(e.target.value) || 5 })}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Main Headline" hint="Dark luxury serif (e.g. Grace in Every)">
              <Input
                value={f.heroTitle}
                onChange={(e) => setF({ ...f, heroTitle: e.target.value })}
              />
            </Field>
            <Field label="Highlight Headline" hint="Flowing script italic serif (e.g. Three Piece)">
              <Input
                value={f.heroHighlight}
                onChange={(e) => setF({ ...f, heroHighlight: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Description Text">
            <Textarea
              rows={2}
              value={f.heroDescription}
              onChange={(e) => setF({ ...f, heroDescription: e.target.value })}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Button Text">
              <Input
                value={f.heroButtonText}
                onChange={(e) => setF({ ...f, heroButtonText: e.target.value })}
              />
            </Field>
            <Field label="Button Link Address">
              <Input
                value={f.heroButtonLink}
                onChange={(e) => setF({ ...f, heroButtonLink: e.target.value })}
                placeholder="/category/three-piece"
              />
            </Field>
          </div>
        </div>
      </Section>

      <Button loading={save.isPending} onClick={submit}>Save hero section settings</Button>
    </div>
  );
}

const GRADIENT_PRESETS = [
  { label: "Rose Blush", value: "from-[#FDF2F4] via-[#F9E2E7] to-[#F1CAD4]", bg: "from-[#FDF2F4] to-[#F1CAD4]" },
  { label: "Champagne Gold", value: "from-[#FEF9EE] via-[#FDF0D5] to-[#F7E1B5]", bg: "from-[#FEF9EE] to-[#F7E1B5]" },
  { label: "Powder Sky", value: "from-[#F0F8FD] via-[#DBEFFC] to-[#C3E4FA]", bg: "from-[#F0F8FD] to-[#C3E4FA]" },
  { label: "Mint Sage", value: "from-[#EFFCF6] via-[#D8F8EA] to-[#BAF2D8]", bg: "from-[#EFFCF6] to-[#BAF2D8]" },
  { label: "Atelier Mauve", value: "from-[#FDF3F6] via-[#FBE2EB] to-[#F7CADB]", bg: "from-[#FDF3F6] to-[#F7CADB]" },
  { label: "Royal Lilac", value: "from-[#FAF5FF] via-[#F3E8FF] to-[#E9D5FF]", bg: "from-[#FAF5FF] to-[#E9D5FF]" },
];

function CraftedForm({ v }: { v: S["site"] }) {
  const save = useSave("site");
  const [title, setTitle] = useState(v.craftedSection?.title ?? "CRAFTED FOR THE ELEGANT WOMAN");
  const [subtitle, setSubtitle] = useState(
    v.craftedSection?.subtitle ??
      "Essential silhouettes, rich hand-woven textures, and effortless luxury for every occasion."
  );
  const [items, setItems] = useState<CraftedProductItem[]>(
    v.craftedSection?.items && v.craftedSection.items.length > 0
      ? v.craftedSection.items
      : [
          {
            productId: "zamzam-casual",
            name: "Zamzam Royal Three Piece",
            slug: "three-piece",
            price: 3450,
            imageUrl: "/curated/curated-1.jpg",
            categoryTag: "CASUAL WEAR",
            bgGradient: "from-[#FDF2F4] via-[#F9E2E7] to-[#F1CAD4]",
          },
          {
            productId: "bin-hamid-luxe",
            name: "Bin Hamid Luxury Lawn",
            slug: "three-piece",
            price: 3950,
            imageUrl: "/curated/curated-2.jpg",
            categoryTag: "LUXURY LAWN",
            bgGradient: "from-[#FEF9EE] via-[#FDF0D5] to-[#F7E1B5]",
          },
          {
            productId: "festive-embroidered",
            name: "Summer Floral Festive",
            slug: "three-piece",
            price: 2850,
            imageUrl: "/curated/curated-3.jpg",
            categoryTag: "FESTIVE WEAR",
            bgGradient: "from-[#F0F8FD] via-[#DBEFFC] to-[#C3E4FA]",
          },
          {
            productId: "royal-silk",
            name: "Gul Ahmed Mint Silk",
            slug: "three-piece",
            price: 4200,
            imageUrl: "/curated/curated-4.jpg",
            categoryTag: "ROYAL SILK",
            bgGradient: "from-[#EFFCF6] via-[#D8F8EA] to-[#BAF2D8]",
          },
          {
            productId: "rose-organza",
            name: "Fairu Rose Organza Edit",
            slug: "three-piece",
            price: 4800,
            imageUrl: "/curated/curated-5.jpg",
            categoryTag: "EXCLUSIVE COUTURE",
            bgGradient: "from-[#FDF3F6] via-[#FBE2EB] to-[#F7CADB]",
          },
        ]
  );

  const [pickedProduct, setPickedProduct] = useState<ProductDetail | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string>("");
  const [customTag, setCustomTag] = useState<string>("");
  const [customGradient, setCustomGradient] = useState<string>(GRADIENT_PRESETS[0].value);

  const [photoPickerItemIdx, setPhotoPickerItemIdx] = useState<number | null>(null);
  const [itemPhotos, setItemPhotos] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(false);
  const [manualPhotoUrl, setManualPhotoUrl] = useState<string>("");

  const handlePickProduct = (product: ProductDetail) => {
    setPickedProduct(product);
    const photos: string[] = [];
    if (product.images && product.images.length > 0) {
      photos.push(...product.images.map((im) => im.url));
    }
    const firstImg = photos[0] || "";
    setSelectedPhoto(firstImg);
    setCustomTag(product.categoryName ? product.categoryName.toUpperCase() : "EXCLUSIVE");
    const nextGrad = GRADIENT_PRESETS[items.length % GRADIENT_PRESETS.length].value;
    setCustomGradient(nextGrad);
  };

  const handleAddCard = () => {
    if (!pickedProduct) return;
    if (!selectedPhoto) {
      toast.error("Please select a photo for this product card");
      return;
    }
    const newItem: CraftedProductItem = {
      productId: pickedProduct.id,
      name: pickedProduct.name,
      slug: pickedProduct.slug,
      price: Number(pickedProduct.sellingPrice || pickedProduct.regularPrice || 0),
      imageUrl: selectedPhoto,
      categoryTag: customTag.trim() || undefined,
      bgGradient: customGradient,
    };
    setItems((prev) => [...prev, newItem]);
    setPickedProduct(null);
    toast.success(`"${pickedProduct.name}" added to curated showcase`);
  };

  const handleOpenPhotoPicker = async (idx: number) => {
    const item = items[idx];
    setPhotoPickerItemIdx(idx);
    setLoadingPhotos(true);
    setManualPhotoUrl("");
    try {
      const p = await productsApi.get(item.productId);
      const urls: string[] = [];
      if (p.images && p.images.length > 0) {
        urls.push(...p.images.map((img) => img.url));
      }
      if (item.imageUrl && !urls.includes(item.imageUrl)) {
        urls.push(item.imageUrl);
      }
      setItemPhotos(urls);
    } catch {
      setItemPhotos(item.imageUrl ? [item.imageUrl] : []);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleChangePhoto = (newPhotoUrl: string) => {
    if (photoPickerItemIdx === null || !newPhotoUrl) return;
    setItems((prev) =>
      prev.map((it, idx) => (idx === photoPickerItemIdx ? { ...it, imageUrl: newPhotoUrl } : it))
    );
    setPhotoPickerItemIdx(null);
    toast.success("Card photo updated");
  };

  const moveCard = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
  };

  const removeCard = (idx: number) => {
    if (items.length <= 1) {
      toast.error("Keep at least one card in the section");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = () => {
    if (!title.trim()) {
      toast.error("Section title is required");
      return;
    }
    if (items.length === 0) {
      toast.error("At least one product card is required");
      return;
    }
    save.mutate({
      ...v,
      craftedSection: {
        title: title.trim(),
        subtitle: subtitle.trim(),
        items,
      },
    });
  };

  return (
    <div className="grid items-start gap-4 xl:grid-cols-2 [&>button]:justify-self-start xl:[&>button]:col-span-2">
      <Section
        title="Curated Section Header"
        description="Headings displayed at the top of the expanding accordion gallery on your homepage."
      >
        <div className="space-y-3">
          <Field label="Section Title" required hint="e.g. CRAFTED FOR THE ELEGANT WOMAN">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Subtitle / Description">
            <Textarea rows={2} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section
        title="Add Product from Catalog"
        description="Search your store catalog. When you select a product, you can pick any of its photos and customize its appearance."
      >
        <div className="space-y-3">
          <ProductPicker onPick={handlePickProduct} placeholder="Search product by name or SKU to add..." />
          <p className="text-[12px] text-muted-foreground">
            Tip: You can reorder, change photos, and set luxury background gradients for each card below.
          </p>
        </div>
      </Section>

      <Section
        title={`Showcase Cards (${items.length})`}
        description="Active accordion cards on the homepage. Idle state shows product name pill. On hover, expands to show price in BDT and Add to Cart button."
        className="xl:col-span-2"
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {items.map((item, idx) => (
              <div
                key={`${item.productId}-${idx}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm transition-all hover:shadow-md"
              >
                {/* Header row: Index & Actions */}
                <div className="flex items-center justify-between pb-2 border-b border-border/60 text-xs">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                    <span className="size-5 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold">
                      {idx + 1}
                    </span>
                    <span>{item.categoryTag || "CARD"}</span>
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveCard(idx, idx - 1)}
                      className="rounded p-1 hover:bg-muted disabled:opacity-30 cursor-pointer"
                      title="Move left/up"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === items.length - 1}
                      onClick={() => moveCard(idx, idx + 1)}
                      className="rounded p-1 hover:bg-muted disabled:opacity-30 cursor-pointer"
                      title="Move right/down"
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCard(idx)}
                      className="rounded p-1 text-destructive hover:bg-destructive/10 cursor-pointer"
                      title="Remove card"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card visual preview */}
                <div
                  className={`relative my-2.5 flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b ${
                    item.bgGradient || "from-[#FDF2F4] to-[#F1CAD4]"
                  } p-2 shadow-inner`}
                >
                  <img
                    src={assetUrl(item.imageUrl)}
                    alt={item.name}
                    className="max-h-[85%] max-w-[85%] object-contain filter drop-shadow-md"
                  />
                  <div className="absolute bottom-2 left-2 right-2 flex justify-center">
                    <span className="truncate rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-medium text-neutral-800 shadow">
                      {item.name}
                    </span>
                  </div>
                </div>

                {/* Details & Photo switcher */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-baseline justify-between gap-1">
                    <p className="truncate text-xs font-semibold text-foreground" title={item.name}>
                      {item.name}
                    </p>
                    <span className="shrink-0 text-xs font-bold text-brand-orange">
                      ৳{Number(item.price).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-7 gap-1.5"
                      onClick={() => handleOpenPhotoPicker(idx)}
                    >
                      <ImageIcon className="size-3" />
                      <span>Change Photo</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* DIALOG 1: Configure & Pick Photo for New Product */}
      <Dialog open={!!pickedProduct} onOpenChange={(open) => !open && setPickedProduct(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Configure Card for &quot;{pickedProduct?.name}&quot;</DialogTitle>
            <DialogDescription>
              Select which photo from this product you want to feature on the storefront accordion card.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {pickedProduct && (
              <>
                {/* Product meta badge */}
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 border border-border">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{pickedProduct.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      Category: {pickedProduct.categoryName || "Uncategorized"} • Price: ৳
                      {Number(pickedProduct.sellingPrice || pickedProduct.regularPrice || 0).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-brand-orange">
                    ৳{Number(pickedProduct.sellingPrice || pickedProduct.regularPrice || 0).toLocaleString()}
                  </span>
                </div>

                {/* Photo selection grid */}
                <div>
                  <Label className="block text-xs font-semibold mb-2">
                    Click to Select Featured Photo (from {pickedProduct.images?.length || 0} photos)
                  </Label>
                  {pickedProduct.images && pickedProduct.images.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1 custom-scrollbar">
                      {pickedProduct.images.map((img) => {
                        const isSelected = selectedPhoto === img.url;
                        return (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => setSelectedPhoto(img.url)}
                            className={`group relative aspect-[3/4] overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${
                              isSelected
                                ? "border-brand-orange ring-2 ring-brand-orange/40 scale-[0.98]"
                                : "border-border/70 hover:border-foreground/50 opacity-80 hover:opacity-100"
                            }`}
                          >
                            <img
                              src={assetUrl(img.url)}
                              alt="Product thumbnail"
                              className="size-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-brand-orange text-white shadow">
                                <Check className="size-3 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border border-dashed border-border text-center space-y-2">
                      <p className="text-xs text-muted-foreground">No photos uploaded for this product yet.</p>
                      <ImageField
                        label="Upload photo"
                        folder="products"
                        value={selectedPhoto}
                        onChange={(url) => url && setSelectedPhoto(url)}
                      />
                    </div>
                  )}
                </div>

                {/* Category tag */}
                <Field label="Card Eyebrow Tag" hint="Short uppercase tag (e.g. CASUAL WEAR, LUXURY LAWN)">
                  <Input value={customTag} onChange={(e) => setCustomTag(e.target.value)} />
                </Field>

                {/* Background gradient swatches */}
                <div>
                  <Label className="block text-xs font-semibold mb-2">Card Background Gradient</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {GRADIENT_PRESETS.map((grad) => (
                      <button
                        key={grad.value}
                        type="button"
                        onClick={() => setCustomGradient(grad.value)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left cursor-pointer transition-all ${
                          customGradient === grad.value
                            ? "border-brand-orange ring-2 ring-brand-orange/30 font-medium"
                            : "border-border hover:border-border/80"
                        }`}
                      >
                        <div
                          className={`size-6 rounded-full bg-gradient-to-br ${grad.bg} border border-black/10 shrink-0`}
                        />
                        <span className="text-xs truncate">{grad.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPickedProduct(null)}>
              Cancel
            </Button>
            <Button onClick={handleAddCard} disabled={!selectedPhoto}>
              <Plus className="size-4 mr-1" />
              Add to Curated Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Switch Photo for Existing Card */}
      <Dialog open={photoPickerItemIdx !== null} onOpenChange={(open) => !open && setPhotoPickerItemIdx(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Change Featured Photo</DialogTitle>
            <DialogDescription>
              Select any photo from this product or enter a custom photo address.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {loadingPhotos ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {itemPhotos.length > 0 && (
                  <div>
                    <Label className="block text-xs font-semibold mb-2">
                      Available Photos ({itemPhotos.length})
                    </Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1 custom-scrollbar">
                      {itemPhotos.map((url, i) => {
                        const isCurrent = photoPickerItemIdx !== null && items[photoPickerItemIdx]?.imageUrl === url;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleChangePhoto(url)}
                            className={`group relative aspect-[3/4] overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${
                              isCurrent
                                ? "border-brand-orange ring-2 ring-brand-orange/40"
                                : "border-border/70 hover:border-foreground/50 opacity-80 hover:opacity-100"
                            }`}
                          >
                            <img
                              src={assetUrl(url)}
                              alt="Product thumbnail"
                              className="size-full object-cover"
                            />
                            {isCurrent && (
                              <div className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-brand-orange text-white shadow">
                                <Check className="size-3 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-border p-3 space-y-2">
                  <Label className="block text-xs font-semibold">Or Enter Custom Photo Address</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="e.g. /garments/garment-1-front.webp"
                      value={manualPhotoUrl}
                      onChange={(e) => setManualPhotoUrl(e.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={!manualPhotoUrl.trim()}
                      onClick={() => handleChangePhoto(manualPhotoUrl.trim())}
                    >
                      Use Photo
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotoPickerItemIdx(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button loading={save.isPending} onClick={submit}>
        Save Curated Showcase
      </Button>
    </div>
  );
}

type MobileKey = "bkash" | "nagad" | "rocket";
const MOBILE: { key: MobileKey; label: string; hint: string }[] = [
  { key: "bkash", label: "bKash", hint: "Customers send money to your bKash number and enter the transaction ID." },
  { key: "nagad", label: "Nagad", hint: "Customers send money to your Nagad number and enter the transaction ID." },
  { key: "rocket", label: "Rocket", hint: "Customers send money to your Rocket number and enter the transaction ID." },
];

function PaymentForm({ v }: { v: S["payment"] }) {
  const [f, setF] = useState({
    ...v,
    bkashNumber: v.bkashNumber ?? "", bkashInstructions: v.bkashInstructions ?? "",
    nagadNumber: v.nagadNumber ?? "", nagadInstructions: v.nagadInstructions ?? "",
    rocketNumber: v.rocketNumber ?? "", rocketInstructions: v.rocketInstructions ?? "",
  });
  const save = useSave("payment");
  const submit = () => {
    if (!f.codEnabled && !f.bkashEnabled && !f.nagadEnabled && !f.rocketEnabled) return toast.error("Keep at least one payment method on");
    for (const m of MOBILE) {
      if (f[`${m.key}Enabled`] && !/^(\+?88)?01[3-9]\d{8}$/.test(f[`${m.key}Number`].replace(/[\s-]/g, ""))) return toast.error(`Enter your ${m.label} number to accept ${m.label}`);
    }
    save.mutate({
      codEnabled: f.codEnabled,
      bkashEnabled: f.bkashEnabled, bkashNumber: nz(f.bkashNumber), bkashAccountType: f.bkashAccountType, bkashInstructions: nz(f.bkashInstructions),
      nagadEnabled: f.nagadEnabled, nagadNumber: nz(f.nagadNumber), nagadAccountType: f.nagadAccountType, nagadInstructions: nz(f.nagadInstructions),
      rocketEnabled: f.rocketEnabled, rocketNumber: nz(f.rocketNumber), rocketAccountType: f.rocketAccountType, rocketInstructions: nz(f.rocketInstructions),
    });
  };
  return (
    <div className="grid items-start gap-4 xl:grid-cols-2 [&>button]:justify-self-start xl:[&>button]:col-span-2">
      <Section title="Payment methods" description="Customers choose one at checkout. Mobile banking: they send money to your number and type the transaction ID; you verify it on the order.">
        <div className="divide-y divide-border">
          <Toggle label="Cash on delivery" hint="Customers pay the courier." checked={f.codEnabled} onChange={(codEnabled) => setF({ ...f, codEnabled })} />
          {MOBILE.map((m) => (
            <div key={m.key}>
              <Toggle label={`${m.label} (send money)`} hint={m.hint} checked={f[`${m.key}Enabled`]} onChange={(on) => setF({ ...f, [`${m.key}Enabled`]: on })} />
              {f[`${m.key}Enabled`] && (
                <div className="mb-3 grid gap-3 sm:grid-cols-2">
                  <Field label={`${m.label} number`} required><Input value={f[`${m.key}Number`]} onChange={(e) => setF({ ...f, [`${m.key}Number`]: e.target.value })} placeholder="01XXXXXXXXX" /></Field>
                  <Field label="Account type"><Select value={f[`${m.key}AccountType`]} onChange={(e) => setF({ ...f, [`${m.key}AccountType`]: e.target.value })}><option value="personal">Personal</option><option value="merchant">Merchant</option><option value="agent">Agent</option></Select></Field>
                  <Field label="Instructions shown to the customer" className="sm:col-span-2"><Textarea rows={3} value={f[`${m.key}Instructions`]} onChange={(e) => setF({ ...f, [`${m.key}Instructions`]: e.target.value })} /></Field>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>
      <Button loading={save.isPending} onClick={submit}>Save payment settings</Button>
    </div>
  );
}

function ShippingForm({ v }: { v: S["shipping"] }) {
  const [f, setF] = useState({ ...v, freeShippingThreshold: v.freeShippingThreshold === null ? "" : String(v.freeShippingThreshold), cities: v.insideDhakaCities.join(", ") });
  const save = useSave("shipping");
  const n = (k: keyof typeof f, label: string) => (
    <Field label={label}><Input type="number" min={0} value={String(f[k] as number)} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} /></Field>
  );
  const submit = () => {
    const pairs: [number, number, string][] = [[f.globalMinDays, f.globalMaxDays, "Standard"], [f.insideDhakaMinDays, f.insideDhakaMaxDays, "Inside Dhaka"], [f.outsideDhakaMinDays, f.outsideDhakaMaxDays, "Outside Dhaka"]];
    const badPair = pairs.find(([a, b]) => a > b);
    if (badPair) return toast.error(`${badPair[2]}: the fastest days cannot be more than the slowest`);
    save.mutate({
      mode: f.mode, globalRate: f.globalRate, globalMinDays: f.globalMinDays, globalMaxDays: f.globalMaxDays,
      insideDhakaRate: f.insideDhakaRate, insideDhakaMinDays: f.insideDhakaMinDays, insideDhakaMaxDays: f.insideDhakaMaxDays,
      outsideDhakaRate: f.outsideDhakaRate, outsideDhakaMinDays: f.outsideDhakaMinDays, outsideDhakaMaxDays: f.outsideDhakaMaxDays,
      insideDhakaCities: f.cities.split(",").map((s) => s.trim()).filter(Boolean),
      freeShippingThreshold: f.freeShippingThreshold === "" ? null : Number(f.freeShippingThreshold),
    });
  };
  return (
    <div className="grid items-start gap-4 xl:grid-cols-2 [&>button]:justify-self-start xl:[&>button]:col-span-2">
      <Section title="How shipping is charged">
        <Field label="Mode"><Select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value as "GLOBAL" | "ZONE" })} className="max-w-xs"><option value="ZONE">By area: inside / outside Dhaka</option><option value="GLOBAL">One rate everywhere</option></Select></Field>
        {f.mode === "GLOBAL" ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">{n("globalRate", "Rate ৳")}{n("globalMinDays", "Fastest (days)")}{n("globalMaxDays", "Slowest (days)")}</div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">{n("insideDhakaRate", "Inside Dhaka rate ৳")}{n("insideDhakaMinDays", "Fastest (days)")}{n("insideDhakaMaxDays", "Slowest (days)")}</div>
            <div className="grid gap-3 sm:grid-cols-3">{n("outsideDhakaRate", "Outside Dhaka rate ৳")}{n("outsideDhakaMinDays", "Fastest (days)")}{n("outsideDhakaMaxDays", "Slowest (days)")}</div>
            <Field label="Districts counted as 'inside Dhaka'" hint="Comma separated"><Input value={f.cities} onChange={(e) => setF({ ...f, cities: e.target.value })} /></Field>
          </div>
        )}
      </Section>
      <Section title="Free shipping"><Field label="Free shipping on orders from ৳" hint="Empty = never free"><Input type="number" min={0} value={f.freeShippingThreshold} onChange={(e) => setF({ ...f, freeShippingThreshold: e.target.value })} className="max-w-xs" /></Field></Section>
      <Button loading={save.isPending} onClick={submit}>Save shipping settings</Button>
    </div>
  );
}

function ReturnsForm({ v }: { v: S["returns"] }) {
  const [f, setF] = useState({ ...v, policyText: v.policyText ?? "" });
  const save = useSave("returns");
  return (
    <div className="grid items-start gap-4 xl:grid-cols-2 [&>button]:justify-self-start xl:[&>button]:col-span-2">
      <Section title="Returns">
        <Toggle label="Accept returns" hint="Turn off to stop new return requests." checked={f.returnsEnabled} onChange={(returnsEnabled) => setF({ ...f, returnsEnabled })} />
        <div className="mt-2 space-y-3">
          <Field label="Return window (days after delivery)"><Input type="number" min={0} max={365} value={f.returnWindowDays} onChange={(e) => setF({ ...f, returnWindowDays: Number(e.target.value) })} className="max-w-[160px]" /></Field>
          <Field label="Policy text shown to customers"><Textarea rows={5} value={f.policyText} onChange={(e) => setF({ ...f, policyText: e.target.value })} /></Field>
        </div>
      </Section>
      <Button loading={save.isPending} onClick={() => save.mutate({ returnsEnabled: f.returnsEnabled, returnWindowDays: f.returnWindowDays, policyText: nz(f.policyText) })}>Save return settings</Button>
    </div>
  );
}

function EmailForm({ v }: { v: S["email"] }) {
  const [f, setF] = useState({ ...v, replyTo: v.replyTo ?? "", smtpHost: v.smtpHost ?? "", smtpPort: v.smtpPort ? String(v.smtpPort) : "", smtpUser: v.smtpUser ?? "", adminNotificationEmail: v.adminNotificationEmail ?? "" });
  const [smtpPass, setSmtpPass] = useState("");
  const [resendKey, setResendKey] = useState("");
  const [to, setTo] = useState("");
  const body = () => ({
    provider: f.provider, fromName: f.fromName, fromEmail: f.fromEmail, replyTo: nz(f.replyTo),
    smtpHost: nz(f.smtpHost), smtpPort: f.smtpPort ? Number(f.smtpPort) : null, smtpSecure: f.smtpSecure, smtpUser: nz(f.smtpUser),
    ...(smtpPass ? { smtpPass } : {}), ...(resendKey ? { resendApiKey: resendKey } : {}),
    adminNotificationEmail: nz(f.adminNotificationEmail),
    notifyCustomerOrderPlaced: f.notifyCustomerOrderPlaced, notifyCustomerOrderStatus: f.notifyCustomerOrderStatus, notifyAdminNewOrder: f.notifyAdminNewOrder,
    notifyAdminContactMessage: f.notifyAdminContactMessage, notifyAdminSupportTicket: f.notifyAdminSupportTicket, notifyCustomerTicketReply: f.notifyCustomerTicketReply, sendNewsletterWelcome: f.sendNewsletterWelcome,
  });
  const save = useSave("email");
  const test = useAct(() => settingsApi.testEmail(to.trim(), body()), { success: "Test email sent — check the inbox" });
  const set = <K extends keyof typeof f>(k: K, val: (typeof f)[K]) => setF({ ...f, [k]: val });
  return (
    <div className="grid items-start gap-4 xl:grid-cols-2 [&>button]:justify-self-start xl:[&>button]:col-span-2">
      <Section title="Sending emails">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Provider"><Select value={f.provider} onChange={(e) => set("provider", e.target.value as S["email"]["provider"])}><option value="none">Off (no emails)</option><option value="smtp">SMTP</option><option value="resend">Resend</option></Select></Field>
            <Field label="From name"><Input value={f.fromName} onChange={(e) => set("fromName", e.target.value)} /></Field>
            <Field label="From email"><Input type="email" value={f.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} /></Field>
          </div>
          {f.provider === "smtp" && (
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="SMTP host"><Input value={f.smtpHost} onChange={(e) => set("smtpHost", e.target.value)} /></Field>
              <Field label="Port"><Input type="number" value={f.smtpPort} onChange={(e) => set("smtpPort", e.target.value)} /></Field>
              <Field label="User"><Input value={f.smtpUser} onChange={(e) => set("smtpUser", e.target.value)} autoComplete="off" /></Field>
              <Field label="Password" hint={v.smtpPassSet ? "Saved — leave empty to keep" : undefined}><Input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} autoComplete="new-password" /></Field>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] sm:col-span-4"><Switch checked={f.smtpSecure} onCheckedChange={(x) => set("smtpSecure", x)} />Use SSL/TLS (port 465)</label>
            </div>
          )}
          {f.provider === "resend" && <Field label="Resend API key" hint={v.resendApiKeySet ? "Saved — leave empty to keep" : undefined}><Input type="password" value={resendKey} onChange={(e) => setResendKey(e.target.value)} autoComplete="new-password" /></Field>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Reply-to email"><Input type="email" value={f.replyTo} onChange={(e) => set("replyTo", e.target.value)} /></Field>
            <Field label="Send admin alerts to"><Input type="email" value={f.adminNotificationEmail} onChange={(e) => set("adminNotificationEmail", e.target.value)} /></Field>
          </div>
        </div>
      </Section>
      <Section title="Which emails to send">
        <div className="divide-y divide-border">
          <Toggle label="Customer: order placed" checked={f.notifyCustomerOrderPlaced} onChange={(x) => set("notifyCustomerOrderPlaced", x)} />
          <Toggle label="Customer: order status changes" checked={f.notifyCustomerOrderStatus} onChange={(x) => set("notifyCustomerOrderStatus", x)} />
          <Toggle label="Customer: reply to their support ticket" checked={f.notifyCustomerTicketReply} onChange={(x) => set("notifyCustomerTicketReply", x)} />
          <Toggle label="Customer: newsletter welcome" checked={f.sendNewsletterWelcome} onChange={(x) => set("sendNewsletterWelcome", x)} />
          <Toggle label="You: new order" checked={f.notifyAdminNewOrder} onChange={(x) => set("notifyAdminNewOrder", x)} />
          <Toggle label="You: new contact message" checked={f.notifyAdminContactMessage} onChange={(x) => set("notifyAdminContactMessage", x)} />
          <Toggle label="You: new support ticket" checked={f.notifyAdminSupportTicket} onChange={(x) => set("notifyAdminSupportTicket", x)} />
        </div>
      </Section>
      <Section title="Send a test email" description="Uses the values above, even before you save.">
        <div className="flex flex-wrap gap-2"><Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@example.com" className="max-w-xs" /><Button variant="outline" disabled={!/^\S+@\S+\.\S+$/.test(to)} loading={test.isPending} onClick={() => test.mutate()}><Mail /> Send test</Button></div>
      </Section>
      <Button loading={save.isPending} onClick={() => save.mutate(body())}>Save email settings</Button>
    </div>
  );
}

export default function Settings() {
  const [f, setF] = useUrlState({ tab: "site" });
  const q = useQuery({ queryKey: ["settings"], queryFn: settingsApi.get });
  if (q.isLoading) return <SettingsSkeleton />;
  if (q.isError || !q.data) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const s = q.data;
  return (
    <div>
      <PageHeader refresh={false} title="Settings" description="How your store looks, charges and talks to customers." />
      <Tabs value={f.tab} onValueChange={(tab) => setF({ tab })}>
        <TabsList className="mb-4">
          <TabsTrigger value="site">Store</TabsTrigger>
          <TabsTrigger value="hero">Hero Showcase</TabsTrigger>
          <TabsTrigger value="crafted">Curated Section</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>
        <div>
          <TabsContent value="site"><SiteForm v={s.site} /></TabsContent>
          <TabsContent value="hero"><HeroForm v={s.site} /></TabsContent>
          <TabsContent value="crafted"><CraftedForm v={s.site} /></TabsContent>
          <TabsContent value="payment"><PaymentForm v={s.payment} /></TabsContent>
          <TabsContent value="shipping"><ShippingForm v={s.shipping} /></TabsContent>
          <TabsContent value="returns"><ReturnsForm v={s.returns} /></TabsContent>
          <TabsContent value="email"><EmailForm v={s.email} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
