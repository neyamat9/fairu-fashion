import type { ReactNode } from "react";
import {
  PackageSearch,
  Ban,
  CheckCircle2,
  EyeOff,
  Package,
  Percent,
  Trophy,
  ReceiptText,
  Search,
  ShoppingCart,
  Store,
  Truck,
  UserRound,
  LayoutGrid,
} from "lucide-react";
import {
  AlertTriangle,
  Banknote,
  Bookmark,
  Copy,
  Trash2,
  Download,
  Layers,
  Plus,
  PlusCircle,
  Upload,
  Boxes,
  Clock,
  PackageCheck,
  PackageX,
  ShoppingBag,
  TrendingUp,
  UserPlus,
  Wallet,
  Wallet2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input, Select, Checkbox } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "./PageHeader";
import { DataTable, type Column } from "./DataTable";
import { DateInput, FilterBar, FilterSelect, SearchInput } from "./FilterBar";
import { Field, Section } from "./Field";
import { StatCard } from "./StatCard";

/**
 * Loading screens that are the REAL page with the data left out: the same title, texts, tab names, filter boxes,
 * column headings and card titles (static text is shown as it is), and grey blocks only where data will appear,
 * sized like that data. So nothing moves or changes shape when the page finishes loading.
 */

const noop = () => undefined;
/** a real button shown as it will look, not clickable */
const HBtn = ({
  label,
  icon,
  brand,
}: {
  label: string;
  icon?: ReactNode;
  brand?: boolean;
}) => (
  <Button
    size="sm"
    variant={brand ? "brand" : "outline"}
    disabled
    tabIndex={-1}
    className="disabled:opacity-100"
  >
    {icon} {label}
  </Button>
);
/** a filter box shown as it will look (not usable) */
const Sel = ({ label, none = false }: { label: string; none?: boolean }) => (
  <FilterSelect
    value=""
    onChange={noop}
    all={none ? null : label}
    options={none ? [{ value: "", label }] : []}
  />
);
const Frozen = ({ children }: { children: ReactNode }) => (
  <div inert aria-busy="true" className="contents">
    {children}
  </div>
);

type Spec = Pick<
  Column<object>,
  "key" | "header" | "align" | "mobile" | "sk" | "className" | "mobileLabel"
>;
const cols = (specs: Spec[]): Column<object>[] =>
  specs.map((c) => ({ ...c, cell: () => null }));

function ListPage({
  title,
  description,
  actions,
  toolbar,
  columns,
  selectable,
  stats,
  tabs,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  toolbar: ReactNode;
  columns: Spec[];
  selectable?: boolean;
  stats?: ReactNode;
  tabs?: string[];
}) {
  const table = (
    <DataTable
      columns={cols(columns)}
      loading
      selectable={selectable}
      toolbar={<Frozen>{toolbar}</Frozen>}
    />
  );
  return (
    <div role="status" aria-label="Loading">
      <PageHeader title={title} description={description} actions={actions} />
      {stats}
      {tabs ? (
        <Tabs value={tabs[0]}>
          <TabsList className="mb-3">
            {tabs.map((t) => (
              <TabsTrigger key={t} value={t}>
                {t}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="mt-4">{table}</div>
        </Tabs>
      ) : (
        table
      )}
    </div>
  );
}

export function OrdersSkeleton() {
  return (
    <ListPage
      stats={
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            hintSk
            label="Total orders"
            value=""
            loading
            tone="navy"
            icon={<ShoppingBag size={18} />}
          />
          <StatCard
            hintSk
            label="To confirm"
            value=""
            loading
            tone="orange"
            icon={<Clock size={18} />}
          />
          <StatCard
            hintSk
            label="To ship"
            value=""
            loading
            tone="sky"
            icon={<Package size={18} />}
          />
          <StatCard
            hintSk
            label="In delivery"
            value=""
            loading
            tone="navy"
            icon={<Truck size={18} />}
          />
          <StatCard
            hintSk
            label="Delivered"
            value=""
            loading
            tone="green"
            icon={<CheckCircle2 size={18} />}
          />
          <StatCard
            hintSk
            label="Payment to verify"
            value=""
            loading
            tone="orange"
            icon={<Wallet size={18} />}
          />
          <StatCard
            hintSk
            label="Revenue"
            value=""
            loading
            tone="orange"
            icon={<Banknote size={18} />}
          />
          <StatCard
            hintSk
            label="Cancelled / returned"
            value=""
            loading
            tone="red"
            icon={<Ban size={18} />}
          />
        </div>
      }
      title="Orders"
      description="Every order from the website and from phone sales."
      actions={
        <>
          <HBtn label="Views" icon={<Bookmark />} />
          <HBtn label="Export CSV" icon={<Download />} />
          <HBtn label="Create order" icon={<PlusCircle />} brand />
        </>
      }
      selectable
      toolbar={
        <FilterBar>
          <SearchInput
            value=""
            onChange={noop}
            placeholder="Order #, customer, phone, product name…"
          />
          <Sel label="All statuses" />
          <Sel label="Any payment" />
          <Sel label="Any method" />
          <Sel label="All sources" />
          <Sel label="Newest first" none />
          <DateInput label="From" value="" onChange={noop} />
          <DateInput label="To" value="" onChange={noop} />
        </FilterBar>
      }
      columns={[
        { key: "order", header: "Order", mobile: "title", sk: "lines2" },
        { key: "customer", header: "Customer", sk: "lines2" },
        { key: "items", header: "Items", sk: "lines2" },
        { key: "payment", header: "Payment", mobile: "end", sk: "badge2" },
        { key: "status", header: "Status", mobile: "badge", sk: "badge" },
        {
          key: "total",
          header: "Total",
          align: "right",
          mobile: "end",
          sk: "num",
        },
      ]}
    />
  );
}

export function ProductsSkeleton() {
  return (
    <ListPage
      stats={
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            hintSk
            label="Total products"
            value=""
            loading
            tone="navy"
            icon={<Boxes size={18} />}
          />
          <StatCard
            hintSk
            label="Live on the shop"
            value=""
            loading
            tone="green"
            icon={<CheckCircle2 size={18} />}
          />
          <StatCard
            hintSk
            label="Draft / hidden"
            value=""
            loading
            tone="orange"
            icon={<EyeOff size={18} />}
          />
          <StatCard
            hintSk
            label="Low stock"
            value=""
            loading
            tone="orange"
            icon={<AlertTriangle size={18} />}
          />
          <StatCard
            hintSk
            label="Out of stock"
            value=""
            loading
            tone="red"
            icon={<PackageX size={18} />}
          />
          <StatCard
            hintSk
            label="Stock value"
            value=""
            loading
            tone="sky"
            icon={<Package size={18} />}
          />
          <StatCard
            hintSk
            label="Best seller (30 days)"
            value=""
            loading
            tone="green"
            icon={<Trophy size={18} />}
          />
          <StatCard
            hintSk
            label="On discount now"
            value=""
            loading
            tone="navy"
            icon={<Percent size={18} />}
          />
        </div>
      }
      title="Products"
      description="Everything you sell. Click a product to edit it."
      actions={
        <>
          <HBtn label="Views" icon={<Bookmark />} />
          <HBtn label="Add product" icon={<PlusCircle />} brand />
        </>
      }
      selectable
      toolbar={
        <FilterBar>
          <SearchInput
            value=""
            onChange={noop}
            placeholder="Name, code, SKU, barcode…"
          />
          <Sel label="All statuses" />
          <Sel label="All categories" />
          <Sel label="All brands" />
          <Sel label="Any stock" />
          <Sel label="Newest" none />
        </FilterBar>
      }
      columns={[
        { key: "product", header: "Product", sk: "thumb2" },
        { key: "status", header: "Status", sk: "badge" },
        { key: "price", header: "Price", align: "right", sk: "num" },
        { key: "stock", header: "Stock", align: "right", sk: "stock" },
        { key: "variants", header: "Variants", align: "center", sk: "badge" },
        { key: "sold", header: "Sold", align: "right", sk: "num" },
        { key: "actions", header: "", align: "right", sk: "icon" },
      ]}
    />
  );
}

export function CustomersSkeleton() {
  return (
    <ListPage
      title="Customers"
      description="Everyone who has an account."
      actions={
        <>
          <HBtn label="Views" icon={<Bookmark />} />
          <HBtn label="Export CSV" icon={<Download />} />
        </>
      }
      toolbar={
        <FilterBar>
          <SearchInput
            value=""
            onChange={noop}
            placeholder="Name, email, phone…"
          />
          <Sel label="All statuses" />
          <Sel label="Ordered or not" />
          <Sel label="Newest" none />
          <DateInput label="Joined from" value="" onChange={noop} />
          <DateInput label="to" value="" onChange={noop} />
        </FilterBar>
      }
      columns={[
        { key: "c", header: "Customer", sk: "lines2" },
        { key: "phone", header: "Phone", sk: "text" },
        { key: "status", header: "Status", sk: "badge" },
        { key: "orders", header: "Orders", align: "right", sk: "num" },
        { key: "spent", header: "Spent", align: "right", sk: "num" },
        { key: "joined", header: "Joined", sk: "text" },
        { key: "login", header: "Last seen", sk: "text" },
      ]}
    />
  );
}

export function InventorySkeleton() {
  return (
    <ListPage
      title="Inventory"
      description="Stock levels, adjustments and the full movement history."
      actions={
        <>
          <HBtn label="Export CSV" icon={<Download />} />
          <HBtn label="Bulk update" icon={<Upload />} />
        </>
      }
      stats={
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Units on hand"
            value=""
            loading
            hintSk
            icon={<Boxes className="size-4" />}
          />
          <StatCard
            label="Stock value (cost)"
            value=""
            loading
            hintSk
            icon={<Wallet className="size-4" />}
            tone="green"
          />
          <StatCard
            label="Low stock"
            value=""
            loading
            icon={<AlertTriangle className="size-4" />}
            tone="orange"
          />
          <StatCard
            label="Out of stock"
            value=""
            loading
            icon={<PackageX className="size-4" />}
            tone="red"
          />
        </div>
      }
      tabs={["Stock levels", "Movement history"]}
      toolbar={
        <FilterBar>
          <SearchInput
            value=""
            onChange={noop}
            placeholder="Product, variant, SKU…"
          />
          <Sel label="All levels" />
        </FilterBar>
      }
      columns={[
        { key: "item", header: "Item", sk: "lines2" },
        { key: "status", header: "Status", sk: "badge" },
        { key: "stock", header: "In stock", align: "right", sk: "num" },
        { key: "state", header: "Level", sk: "badge" },
        { key: "cost", header: "Value (cost)", align: "right", sk: "num" },
        { key: "act", header: "", align: "right", sk: "btn" },
      ]}
    />
  );
}

const simple = (
  title: string,
  description: string,
  placeholder: string | null,
  filters: string[],
  columns: Spec[],
  extra?: { actions?: ReactNode; stats?: ReactNode; selectable?: boolean },
) => (
  <ListPage
    title={title}
    description={description}
    actions={extra?.actions}
    stats={extra?.stats}
    selectable={extra?.selectable}
    toolbar={
      <FilterBar>
        {placeholder && (
          <SearchInput value="" onChange={noop} placeholder={placeholder} />
        )}
        {filters.map((f) => (
          <Sel key={f} label={f} />
        ))}
      </FilterBar>
    }
    columns={columns}
  />
);

export const ReviewsSkeleton = () =>
  simple(
    "Reviews",
    "Approve what appears on product pages.",
    "Text, product, customer…",
    ["All statuses", "Any rating"],
    [
      { key: "r", header: "Review", sk: "lines2" },
      { key: "p", header: "Product", sk: "text" },
      { key: "u", header: "Customer", sk: "lines2" },
      { key: "s", header: "Status", sk: "badge" },
      { key: "a", header: "", align: "right", sk: "icon" },
    ],
    { selectable: true, actions: <HBtn label="Views" icon={<Bookmark />} /> },
  );

export const QuestionsSkeleton = () =>
  simple(
    "Questions",
    "Questions customers ask on product pages.",
    "Question, product…",
    ["All"],
    [
      { key: "q", header: "Question", sk: "lines2" },
      { key: "p", header: "Product", sk: "text" },
      { key: "u", header: "Asked by", sk: "lines2" },
      { key: "s", header: "Status", sk: "badge" },
      { key: "a", header: "", align: "right", sk: "icon" },
    ],
  );

export const ReturnsSkeleton = () =>
  simple(
    "Returns",
    "Return requests from customers.",
    null,
    ["All statuses"],
    [
      { key: "o", header: "Order", sk: "lines2" },
      { key: "c", header: "Customer", sk: "lines2" },
      { key: "i", header: "Items", sk: "text" },
      { key: "r", header: "Reason", sk: "text" },
      { key: "v", header: "Refund value", align: "right", sk: "num" },
      { key: "s", header: "Status", sk: "badge" },
    ],
  );

export const SupportSkeleton = () =>
  simple(
    "Support tickets",
    "Conversations with customers who need help.",
    "Ticket #, subject, customer…",
    ["All statuses", "Any priority", "Any category"],
    [
      { key: "t", header: "Ticket", sk: "lines2" },
      { key: "c", header: "Customer", sk: "lines2" },
      { key: "cat", header: "Category", sk: "text" },
      { key: "p", header: "Priority", sk: "badge" },
      { key: "s", header: "Status", sk: "badge" },
      { key: "m", header: "Msgs", align: "right", sk: "num" },
      { key: "l", header: "Last activity", sk: "text" },
    ],
  );

export const ContactSkeleton = () =>
  simple(
    "Contact messages",
    "Messages from the website contact form.",
    "Name, email, subject…",
    ["All"],
    [
      { key: "f", header: "From", sk: "lines2" },
      { key: "s", header: "Message", sk: "lines2" },
      { key: "st", header: "Status", sk: "badge" },
      { key: "d", header: "Received", sk: "text" },
      { key: "a", header: "", align: "right", sk: "icon" },
    ],
  );

export const NewsletterSkeleton = () =>
  simple(
    "Newsletter",
    "People who signed up for offers.",
    "Email…",
    ["All"],
    [
      { key: "e", header: "Email", sk: "text" },
      { key: "s", header: "Status", sk: "badge" },
      { key: "src", header: "Source", sk: "text" },
      { key: "d", header: "Subscribed", sk: "text" },
      { key: "u", header: "Unsubscribed", sk: "text" },
      { key: "a", header: "", align: "right", sk: "icon" },
    ],
    {
      actions: <HBtn label="Export subscribed" icon={<Download />} />,
      stats: (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:max-w-lg">
          <StatCard label="Subscribed" value="" loading tone="green" />
          <StatCard label="Unsubscribed" value="" loading tone="red" />
        </div>
      ),
    },
  );

export const CouponsSkeleton = () =>
  simple(
    "Coupons",
    "Discount codes customers type at checkout.",
    "Code…",
    ["All"],
    [
      { key: "code", header: "Code", sk: "lines2" },
      { key: "d", header: "Discount", sk: "lines2" },
      { key: "v", header: "Valid", sk: "text" },
      { key: "u", header: "Used", align: "right", sk: "num" },
      { key: "s", header: "State", sk: "badge" },
      { key: "on", header: "Active", sk: "badge" },
      { key: "a", header: "", align: "right", sk: "icon" },
    ],
    {
      actions: (
        <>
          <HBtn label="Bulk generate" icon={<Layers />} />
          <HBtn label="New coupon" icon={<Plus />} brand />
        </>
      ),
    },
  );

export const BackInStockSkeleton = () =>
  simple(
    "Back in stock",
    "Customers waiting for sold-out items. They are emailed automatically when stock returns.",
    "Product, SKU…",
    ["All"],
    [
      { key: "i", header: "Item", sk: "lines2" },
      { key: "w", header: "Waiting", align: "right", sk: "num" },
      { key: "st", header: "Stock now", align: "right", sk: "num" },
      { key: "s", header: "State", sk: "badge" },
      { key: "f", header: "Failed", align: "right", sk: "num" },
      { key: "o", header: "Waiting since", sk: "text" },
      { key: "a", header: "", align: "right", sk: "icon" },
    ],
    {
      stats: (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="People waiting" value="" loading />
          <StatCard label="Items wanted" value="" loading tone="orange" />
          <StatCard label="Ready to alert" value="" loading tone="green" />
          <StatCard label="Failed" value="" loading tone="red" />
        </div>
      ),
    },
  );

/* ---------------------------------------------------------------------------------------------------------------- */

const Field0 = ({
  label,
  hint,
  required,
  h = "h-9",
}: {
  label: string;
  hint?: string;
  required?: boolean;
  h?: string;
}) => (
  <Field label={label} required={required} hint={hint}>
    <Skeleton className={h + " w-full"} />
  </Field>
);

export function ProductEditorSkeleton({ isNew = false }: { isNew?: boolean }) {
  return (
    <div role="status" aria-label="Loading">
      <PageHeader
        back={{ to: "/products", label: "Products" }}
        title={
          isNew ? (
            "Add product"
          ) : (
            <span className="flex h-8 items-center gap-2">
              <Skeleton className="h-6 w-72 max-w-full" />
              <Skeleton className="h-5 w-14" />
            </span>
          )
        }
        description={
          isNew ? (
            "Fill in the details, then add photos and variants."
          ) : (
            <div className="flex h-5 items-center">
              <Skeleton className="h-3.5 w-64 max-w-full" />
            </div>
          )
        }
        actions={
          isNew ? (
            <HBtn label="Create product" brand />
          ) : (
            <>
              <HBtn label="Duplicate" icon={<Copy />} />
              <HBtn
                label="Delete"
                icon={<Trash2 className="text-destructive" />}
              />
              <HBtn label="Save changes" brand />
            </>
          )
        }
      />
      <Tabs value="basics">
        <TabsList className="mb-4">
          {[
            "Basics",
            "Pricing",
            "Inventory & shipping",
            "Photos",
            "Variants",
            "Specs & tags",
            "SEO",
          ].map((t, i) => (
            <TabsTrigger key={t} value={i === 0 ? "basics" : t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="space-y-4" inert>
          <Section title="General">
            <div className="space-y-3">
              <Field0 label="Product name" required />
              <div className="grid gap-3 sm:grid-cols-3">
                <Field0 label="URL slug" hint="Auto-made from the name" />
                <Field0 label="Product code / SKU" />
                <Field0 label="Barcode" />
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <Field0 label="Category" required />
                <Field0 label="Sub-category" />
                <Field0 label="Brand" />
                <Field0
                  label="Status"
                  hint="Draft / inactive are hidden from the shop"
                />
              </div>
            </div>
          </Section>
          <Section title="Description">
            <div className="space-y-3">
              <Field0
                label="Short description"
                hint="One or two lines, shown near the price"
                h="h-20"
              />
              <Field0 label="Full description" required h="h-[184px]" />
              <Field0 label="Warranty" />
            </div>
          </Section>
          <Section
            title="Badges & shop sections"
            description="Where the product is highlighted on the website."
          >
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {[
                "Featured",
                "New arrival",
                "Hot",
                "Best seller",
                "Limited stock",
              ].map((l) => (
                <label key={l} className="flex items-center gap-2 text-[13px]">
                  <Checkbox disabled />
                  {l}
                </label>
              ))}
            </div>
          </Section>
        </div>
      </Tabs>
    </div>
  );
}

const attention = [
  "Orders to confirm",
  "Mobile payments to verify",
  "Open support tickets",
  "Return requests",
  "Low / out of stock items",
  "Unanswered questions",
];
const attIcons = [
  Clock,
  Wallet2,
  PackageCheck,
  PackageCheck,
  AlertTriangle,
  PackageCheck,
];

export function DashboardSkeleton() {
  return (
    <div className="space-y-5 pb-8" role="status" aria-label="Loading">
      <PageHeader
        title="Dashboard"
        description={
          <div className="flex h-10 flex-col justify-center gap-1.5 min-[480px]:h-5">
            <Skeleton className="h-3.5 w-64 max-w-full" />
            <Skeleton className="h-3.5 w-28 min-[480px]:hidden" />
          </div>
        }
        actions={
          <Frozen>
            <Select value="auto" className="w-[120px]" aria-label="Group by">
              <option value="auto">Auto</option>
            </Select>
            <Select value="30" className="w-[150px]" aria-label="Date range">
              <option value="30">Last 30 days</option>
            </Select>
          </Frozen>
        }
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value=""
          loading
          hintSk
          spark={[]}
          icon={<Banknote size={18} />}
          tone="orange"
        />
        <StatCard
          label="Orders"
          value=""
          loading
          hintSk
          spark={[]}
          icon={<ShoppingBag size={18} />}
        />
        <StatCard
          label="Average order"
          value=""
          loading
          hintSk
          spark={[]}
          icon={<TrendingUp size={18} />}
          tone="sky"
        />
        <StatCard
          label="New customers"
          value=""
          loading
          hintSk
          icon={<UserPlus size={18} />}
          tone="green"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Sales over time</CardTitle>
              <CardDescription>
                Revenue per day (cancelled and refunded orders excluded)
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Needs your attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {attention.map((a, i) => {
              const I = attIcons[i];
              return (
                <div
                  key={a}
                  className="flex items-center justify-between rounded px-2 py-2 text-[13px]"
                >
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <I size={15} />
                    {a}
                  </span>
                  <Skeleton className="h-5 w-8" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
            <span className="text-xs font-medium text-primary">
              Full report
            </span>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top categories</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-52 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue by payment & zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Payment method", "Delivery zone"].map((t) => (
              <div key={t}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t}
                </p>
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Latest orders</CardTitle>
            <span className="text-xs font-medium text-primary">View all</span>
          </CardHeader>
          <CardContent className="px-0">
            <ul className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="px-4 py-3">
                  <Skeleton className="h-4 w-full" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Low stock</CardTitle>
            <span className="text-xs font-medium text-primary">Manage</span>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const SecHead = ({
  icon,
  title,
  right,
}: {
  icon: ReactNode;
  title: ReactNode;
  right?: ReactNode;
}) => (
  <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
    <h3 className="flex items-center gap-1.5 text-sm font-semibold">
      {icon} {title}
    </h3>
    {right}
  </div>
);

/** New sale (point of sale): same two columns, same section titles and labels, product tiles as grey blocks. */
export function PosSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="lg:flex lg:h-[calc(100dvh-5.5rem)] lg:flex-col"
    >
      <div className="lg:shrink-0">
        <PageHeader
          back={{ to: "/orders", label: "Orders" }}
          title="New sale"
          description="Pick products, choose the customer (or walk-in), and complete the sale. Stock is reduced straight away."
        />
      </div>
      <div className="grid items-start gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[minmax(0,1fr)] lg:items-stretch xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="min-w-0 space-y-3 lg:min-h-0 lg:overflow-hidden lg:pr-1">
          <div className="rounded border border-border bg-card p-3">
            <div className="relative" inert>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products by name, code or SKU…"
                className="pl-8"
                readOnly
              />
            </div>
            <div className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-hidden px-1 pb-1">
              <span className="flex shrink-0 items-center gap-1.5 rounded border border-primary bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground">
                <LayoutGrid className="size-3.5" /> All products
              </span>
              {[88, 96, 112, 84, 100].map((w, i) => (
                <Skeleton
                  key={i}
                  className="h-[34px] shrink-0"
                  style={{ width: w }}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded border border-border bg-card"
              >
                <Skeleton className="aspect-square w-full rounded-none" />
                <div className="p-2.5">
                  <div className="min-h-[2.4em] space-y-1.5 pt-0.5">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-2/3" />
                  </div>
                  <Skeleton className="mt-2 h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="hidden min-h-0 flex-col lg:flex lg:overflow-hidden lg:rounded lg:border lg:border-border lg:bg-background">
          <div className="min-h-0 flex-1 overflow-hidden p-3">
            <div className="flex flex-col gap-3 p-0.5">
              <section className="rounded border border-border bg-card">
                <SecHead
                  icon={<UserRound className="size-4 text-muted-foreground" />}
                  title="Customer"
                  right={
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      <Checkbox disabled />{" "}
                      <Store className="size-3.5 text-muted-foreground" />{" "}
                      Walk-in customer
                    </span>
                  }
                />
                <div className="space-y-2.5 p-3">
                  <div className="relative" inert>
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Click to choose, or type a name, email or phone…"
                      className="pl-8"
                      readOnly
                    />
                  </div>
                </div>
              </section>
              <section className="rounded border border-border bg-card">
                <SecHead
                  icon={
                    <ShoppingCart className="size-4 text-muted-foreground" />
                  }
                  title={
                    <>
                      Sale{" "}
                      <span className="rounded bg-brand px-1.5 text-[10px] font-bold leading-4 text-brand-foreground">
                        0
                      </span>
                    </>
                  }
                />
                <div className="flex flex-col items-center gap-1 px-4 py-8 text-center text-muted-foreground">
                  <PackageSearch className="size-8 opacity-50" />
                  <p className="text-sm font-medium text-foreground">
                    No products yet
                  </p>
                  <p className="text-xs">
                    Tap a product to add it to the sale.
                  </p>
                </div>
              </section>
              <section className="rounded border border-border bg-card">
                <SecHead
                  icon={<Truck className="size-4 text-muted-foreground" />}
                  title="Delivery details"
                />
                <div className="space-y-2.5 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Field0 label="Full name" required />
                    <Field0 label="Phone" required />
                  </div>
                  <Field0 label="Address" required />
                  <div className="grid grid-cols-3 gap-3">
                    <Field0 label="Division" />
                    <Field0 label="District" required />
                    <Field0 label="Upazila / thana" />
                  </div>
                </div>
              </section>
            </div>
          </div>
          <div className="shrink-0 space-y-2 border-t border-border bg-card p-3">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">0 items</span>
              <Skeleton className="h-6 w-16" />
            </div>
            <Button
              className="h-11 w-full text-[15px] disabled:opacity-100"
              variant="brand"
              disabled
            >
              <ReceiptText /> Create order
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

const F2 = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-3 sm:grid-cols-2">{children}</div>
);

export function SettingsSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <PageHeader
        refresh={false}
        title="Settings"
        description="How your store looks, charges and talks to customers."
      />
      <Tabs value="Store">
        <TabsList className="mb-4">
          {["Store", "Payment", "Shipping", "Returns", "Email"].map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="grid items-start gap-4 xl:grid-cols-2" inert>
        <Section title="Store">
          <div className="space-y-3">
            <F2>
              <Field0 label="Store name" required />
              <Field0 label="Tagline" />
            </F2>
            <F2>
              <Field0 label="Logo" h="h-20" />
              <Field0 label="Favicon" h="h-20" />
            </F2>
          </div>
        </Section>
        <Section title="Contact">
          <F2>
            <Field0 label="Contact email" />
            <Field0 label="Hotline" />
            <Field0 label="WhatsApp" />
            <Field0 label="Business hours" />
            <Field label="Address" className="sm:col-span-2">
              <Skeleton className="h-[66px] w-full" />
            </Field>
          </F2>
        </Section>
        <Section title="Social links">
          <F2>
            {[
              "Facebook",
              "Instagram",
              "Youtube",
              "Tiktok",
              "Twitter",
              "Linkedin",
            ].map((l) => (
              <Field0 key={l} label={l} />
            ))}
          </F2>
        </Section>
        <Section title="Search engines">
          <div className="space-y-3">
            <Field0 label="Meta title" />
            <Field0 label="Meta description" h="h-[66px]" />
          </div>
        </Section>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <PageHeader
        refresh={false}
        title="My account"
        description="Your details and password."
      />
      <div className="grid items-start gap-4 xl:grid-cols-2" inert>
        <Section title="Profile">
          <div className="mb-4 flex items-center gap-3">
            <Skeleton className="size-14" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <F2>
            <Field0 label="Name" required />
            <Field0 label="Phone" />
          </F2>
        </Section>
        <Section title="Change password">
          <div className="space-y-3">
            <Field0 label="Current password" />
            <Field0 label="New password" />
            <Field0 label="Repeat new password" />
          </div>
        </Section>
      </div>
    </div>
  );
}
