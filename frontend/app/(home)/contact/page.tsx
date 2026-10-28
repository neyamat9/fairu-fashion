"use client";

import { errorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { sendContactMessage } from "@/lib/services/support.service";
import { getSiteSettings, type SiteSettings } from "@/lib/services/site.service";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  MessageSquare,
  Phone,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  Send,
  CheckCircle2,
  User,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  Tag,
} from "lucide-react";

const TOPICS = [
  { id: "Order Inquiry", label: "Order & Tracking", icon: Truck },
  { id: "Sizing & Fit", label: "Sizing & Fit Advice", icon: Sparkles },
  { id: "Product Details", label: "Product & Fabric", icon: Tag },
  { id: "Custom Request", label: "Custom / Bridal Request", icon: Headphones },
  { id: "General Feedback", label: "General Feedback", icon: MessageSquare },
] as const;

const FAQS = [
  {
    q: "How fast is delivery across Bangladesh?",
    a: "We provide nationwide express doorstep delivery across all 64 districts. Inside Dhaka, deliveries arrive within 24–48 hours. Outside Dhaka, orders typically reach you within 3–5 business days.",
  },
  {
    q: "Can I inspect the parcel before paying with Cash on Delivery?",
    a: "Yes! Cash on delivery is supported throughout Bangladesh. You are welcome to check the parcel exterior and contents in front of the delivery agent before completing your payment.",
  },
  {
    q: "Do you offer sizing or styling guidance?",
    a: "Absolutely. Our personal styling team is available 24/7 on WhatsApp (+880 1620-490985). Share your measurements or preferred fit and we will recommend the perfect size or tailoring options.",
  },
  {
    q: "How can I track my existing order?",
    a: "You can track your parcel live anytime by visiting our Track Order page with your order number and phone number, or by messaging our team on WhatsApp.",
    link: { text: "Go to Track Order", href: "/track-order" },
  },
  {
    q: "What is your exchange and return policy?",
    a: "We want you to love your Fairu garments. If there is any size mismatch or defective item, you can request an easy exchange or return within 7 days of delivery.",
    link: { text: "View Return Policy", href: "/returns-policy" },
  },
];

export default function ContactPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [topic, setTopic] = useState<(typeof TOPICS)[number]["id"]>("Order Inquiry");
  const [f, setF] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    website: "", // Honeypot anti-spam
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    getSiteSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (user) {
      setF((p) => ({
        ...p,
        name: p.name || user.name || "",
        email: p.email || user.email || "",
        phone: p.phone || user.phone || "",
      }));
    }
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2) return setError("Please enter your full name");
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return setError("Please enter a valid email address");
    if (f.phone && !/^(\+?88)?01[3-9]\d{8}$/.test(f.phone.replace(/[\s-]/g, ""))) {
      return setError("Please enter a valid Bangladesh mobile number (e.g. 01620490985)");
    }
    if (f.subject.trim().length < 3) return setError("Please provide a brief subject");
    if (f.message.trim().length < 10) return setError("Your message should be at least 10 characters");

    setBusy(true);
    setError(null);
    try {
      await sendContactMessage({
        ...f,
        topic,
        phone: f.phone.replace(/[\s-]/g, "") || undefined,
        website: f.website || undefined,
      });
      setDone(true);
      toast.success("Inquiry received! We'll reply to your email shortly.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const s = settings?.site;
  const hotline = s?.hotline || "01620490985";
  const whatsapp = s?.whatsapp || "01620490985";
  const email = s?.contactEmail || "neyamat7.ullah@gmail.com";
  const hours = s?.businessHours || "Always Open (24/7)";
  const address = s?.address || "Dhaka, Bangladesh";
  const cleanPhone = hotline.replace(/[^\d+]/g, "");
  const cleanWa = whatsapp.replace(/[^\d]/g, "");
  const waFull = cleanWa.startsWith("88") ? cleanWa : (cleanWa.startsWith("0") ? `88${cleanWa}` : `880${cleanWa}`);

  return (
    <div className="bg-[#FAF7F5] dark:bg-[#141110] min-h-screen text-[#2E2825] dark:text-[#E8E2DE] selection:bg-[#9E596B]/20 selection:text-[#9E596B]">
      
      {/* 1. LUXURY HERO BANNER */}
      <section className="relative overflow-hidden border-b border-[#EBE4DF] dark:border-[#2A2422] bg-gradient-to-b from-white via-[#FCFAF8] to-[#FAF7F5] dark:from-[#1C1816] dark:via-[#161312] dark:to-[#141110] px-4 py-14 sm:py-20 md:px-8">
        {/* Subtle decorative background circles */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#9E596B]/5 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-[#D4AF37]/5 blur-3xl" />

        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#EBD8DE] dark:border-[#382B30] bg-[#FDF5F7] dark:bg-[#251A1E] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-[#9E596B] shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Fairu Concierge & Customer Care</span>
          </div>

          <h1 className="mt-5 font-outfit text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl text-foreground">
            We’re Here to <span className="text-[#9E596B]">Assist You</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-[#736862] dark:text-neutral-400">
            Whether you require personal styling advice, fabric and sizing guidance, order assistance, or bespoke inquiries, our customer care specialists are available 24/7.
          </p>
        </div>
      </section>

      {/* 2. FOUR QUICK ACTION CHANNEL CARDS */}
      <section className="mx-auto max-w-6xl px-4 -mt-8 sm:-mt-10 md:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* WhatsApp Card */}
          <a
            href={`https://wa.me/${waFull}?text=${encodeURIComponent("Hi Fairu Fashion, I have an inquiry.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col justify-between rounded-2xl border border-[#EBE4DF] dark:border-[#2E2825] bg-white dark:bg-[#1E1A18] p-5 sm:p-6 shadow-sm hover:shadow-lg hover:border-[#25D366]/40 hover:-translate-y-1 transition-all duration-300"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#25D366]/10 text-[#25D366] transition-transform group-hover:scale-110">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Instant Chat
                </span>
              </div>
              <h2 className="mt-4 font-outfit text-base font-bold text-foreground">WhatsApp Care</h2>
              <p className="mt-1 text-xs text-[#736862] dark:text-neutral-400">Direct styling & order chat</p>
              <p className="mt-2 text-sm font-extrabold text-foreground">{whatsapp}</p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-[#25D366] group-hover:gap-2 transition-all">
              <span>Start WhatsApp Chat</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </a>

          {/* Hotline Phone Card */}
          <a
            href={`tel:${cleanPhone}`}
            className="group relative flex flex-col justify-between rounded-2xl border border-[#EBE4DF] dark:border-[#2E2825] bg-white dark:bg-[#1E1A18] p-5 sm:p-6 shadow-sm hover:shadow-lg hover:border-[#9E596B]/40 hover:-translate-y-1 transition-all duration-300"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#9E596B]/10 text-[#9E596B] transition-transform group-hover:scale-110">
                  <Phone className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-[#9E596B]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#9E596B]">
                  {hours}
                </span>
              </div>
              <h2 className="mt-4 font-outfit text-base font-bold text-foreground">Direct Hotline</h2>
              <p className="mt-1 text-xs text-[#736862] dark:text-neutral-400">Speak to our concierge</p>
              <p className="mt-2 text-sm font-extrabold text-foreground">{hotline}</p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-[#9E596B] group-hover:gap-2 transition-all">
              <span>Call Direct Line</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </a>

          {/* Email Card */}
          <a
            href={`mailto:${email}`}
            className="group relative flex flex-col justify-between rounded-2xl border border-[#EBE4DF] dark:border-[#2E2825] bg-white dark:bg-[#1E1A18] p-5 sm:p-6 shadow-sm hover:shadow-lg hover:border-[#9E596B]/40 hover:-translate-y-1 transition-all duration-300"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#9E596B]/10 text-[#9E596B] transition-transform group-hover:scale-110">
                  <Mail className="h-6 w-6" />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Replies in 2–4 hrs
                </span>
              </div>
              <h2 className="mt-4 font-outfit text-base font-bold text-foreground">Email Inquiries</h2>
              <p className="mt-1 text-xs text-[#736862] dark:text-neutral-400">Official customer desk</p>
              <p className="mt-2 text-xs font-bold text-foreground truncate" title={email}>{email}</p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-[#9E596B] group-hover:gap-2 transition-all">
              <span>Send An Email</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </a>

          {/* Location & Hub Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-[#EBE4DF] dark:border-[#2E2825] bg-white dark:bg-[#1E1A18] p-5 sm:p-6 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <MapPin className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  64 Districts
                </span>
              </div>
              <h2 className="mt-4 font-outfit text-base font-bold text-foreground">Dhaka Hub</h2>
              <p className="mt-1 text-xs text-[#736862] dark:text-neutral-400">Doorstep delivery hub</p>
              <p className="mt-2 text-xs font-extrabold text-foreground">{address}</p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Truck className="h-3.5 w-3.5" />
              <span>Nationwide Express</span>
            </div>
          </div>

        </div>
      </section>

      {/* 3. MAIN FORM & SIDEBAR SECTION */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_360px] items-start">
          
          {/* LEFT: INTERACTIVE CONTACT FORM */}
          <div className="rounded-3xl border border-[#EBE4DF] dark:border-[#2E2825] bg-white dark:bg-[#1E1A18] p-6 sm:p-10 shadow-sm">
            <div className="border-b border-[#F0EAE6] dark:border-[#2E2825] pb-6">
              <h2 className="font-outfit text-2xl font-black text-foreground sm:text-3xl">
                Send a <span className="text-[#9E596B]">Message</span>
              </h2>
              <p className="mt-2 text-sm text-[#736862] dark:text-neutral-400">
                Please fill in your details below and our team will get in touch with you right away.
              </p>
            </div>

            {done ? (
              /* SUCCESS STATE */
              <div className="py-12 text-center animate-in fade-in-50 duration-500">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-10 w-10 stroke-[2]" />
                </div>
                <h3 className="mt-6 font-outfit text-2xl font-bold text-foreground">
                  Inquiry Received Successfully!
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-[#736862] dark:text-neutral-400">
                  Thank you, <strong className="text-foreground">{f.name}</strong>. Your message has been delivered to our concierge desk. We will reply to <span className="font-semibold text-[#9E596B]">{f.email}</span> shortly.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a
                    href={`https://wa.me/${waFull}?text=${encodeURIComponent(`Hi Fairu Fashion, I submitted a contact inquiry regarding "${f.subject || topic}".`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-[#20ba59] transition-all"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Follow Up on WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setDone(false);
                      setF({ name: "", email: "", phone: "", subject: "", message: "", website: "" });
                    }}
                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-[#E3DBD5] dark:border-[#38312C] px-6 py-3 text-xs font-bold uppercase tracking-wider text-foreground hover:bg-[#FAF7F5] dark:hover:bg-[#25201E] transition-all"
                  >
                    Send Another Message
                  </button>
                </div>
              </div>
            ) : (
              /* FORM FIELDS */
              <form onSubmit={submit} noValidate className="mt-8 space-y-6">
                
                {/* Topic Selection Pills */}
                <div>
                  <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-[#736862] dark:text-neutral-400">
                    What can we help you with?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TOPICS.map((t) => {
                      const Icon = t.icon;
                      const active = topic === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTopic(t.id)}
                          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                            active
                              ? "bg-[#9E596B] text-white shadow-sm ring-2 ring-[#9E596B]/30"
                              : "bg-[#F7F3F0] dark:bg-[#25201E] border border-[#EBE4DF] dark:border-[#332A26] text-[#4A423D] dark:text-neutral-300 hover:border-[#9E596B]/40 hover:bg-[#FAF6F4]"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Name & Email Row */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="c-name" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#736862] dark:text-neutral-400">
                      Your Full Name <span className="text-[#9E596B]">*</span>
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="c-name"
                        type="text"
                        required
                        placeholder="e.g. Ayesha Rahman"
                        value={f.name}
                        onChange={(e) => setF({ ...f, name: e.target.value })}
                        className="w-full rounded-xl border border-[#E3DBD5] dark:border-[#38312C] bg-white dark:bg-[#181412] pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-[#9E596B] focus:outline-none focus:ring-4 focus:ring-[#9E596B]/15 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="c-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#736862] dark:text-neutral-400">
                      Email Address <span className="text-[#9E596B]">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="c-email"
                        type="email"
                        required
                        placeholder="ayesha@example.com"
                        value={f.email}
                        onChange={(e) => setF({ ...f, email: e.target.value })}
                        className="w-full rounded-xl border border-[#E3DBD5] dark:border-[#38312C] bg-white dark:bg-[#181412] pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-[#9E596B] focus:outline-none focus:ring-4 focus:ring-[#9E596B]/15 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Phone & Subject Row */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="c-phone" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#736862] dark:text-neutral-400">
                      Phone / WhatsApp Number
                    </label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="c-phone"
                        type="tel"
                        placeholder="01620490985"
                        value={f.phone}
                        onChange={(e) => setF({ ...f, phone: e.target.value })}
                        className="w-full rounded-xl border border-[#E3DBD5] dark:border-[#38312C] bg-white dark:bg-[#181412] pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-[#9E596B] focus:outline-none focus:ring-4 focus:ring-[#9E596B]/15 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="c-subject" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#736862] dark:text-neutral-400">
                      Inquiry Subject <span className="text-[#9E596B]">*</span>
                    </label>
                    <div className="relative">
                      <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="c-subject"
                        type="text"
                        required
                        placeholder="e.g. Lawn Three Piece Sizing Question"
                        value={f.subject}
                        onChange={(e) => setF({ ...f, subject: e.target.value })}
                        className="w-full rounded-xl border border-[#E3DBD5] dark:border-[#38312C] bg-white dark:bg-[#181412] pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-[#9E596B] focus:outline-none focus:ring-4 focus:ring-[#9E596B]/15 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Message Textarea */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="c-msg" className="block text-xs font-bold uppercase tracking-wider text-[#736862] dark:text-neutral-400">
                      Your Message <span className="text-[#9E596B]">*</span>
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      {f.message.length}/5000 characters
                    </span>
                  </div>
                  <textarea
                    id="c-msg"
                    rows={5}
                    required
                    maxLength={5000}
                    placeholder="Tell us what you need assistance with (order details, product names, custom requests)..."
                    value={f.message}
                    onChange={(e) => setF({ ...f, message: e.target.value })}
                    className="w-full rounded-xl border border-[#E3DBD5] dark:border-[#38312C] bg-white dark:bg-[#181412] p-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-[#9E596B] focus:outline-none focus:ring-4 focus:ring-[#9E596B]/15 transition-all"
                  />
                </div>

                {/* Honeypot for spam bots: invisible */}
                <div aria-hidden="true" className="absolute -left-[9999px]">
                  <label>
                    Website
                    <input
                      tabIndex={-1}
                      autoComplete="off"
                      value={f.website}
                      onChange={(e) => setF({ ...f, website: e.target.value })}
                    />
                  </label>
                </div>

                {/* Error message alert */}
                {error && (
                  <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-600 dark:text-rose-400">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <p className="text-xs text-[#736862] dark:text-neutral-400 text-center sm:text-left">
                    We typically answer via email or phone within a few hours.
                  </p>

                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#9E596B] hover:bg-[#8A4959] px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-md hover:shadow-lg disabled:opacity-60 transition-all cursor-pointer"
                  >
                    {busy ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Sending Inquiry...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}
          </div>

          {/* RIGHT: CONCIERGE INFORMATION & SOCIAL SIDEBAR */}
          <div className="space-y-6">
            
            {/* Service Commitments Card */}
            <div className="rounded-3xl border border-[#EBE4DF] dark:border-[#2E2825] bg-white dark:bg-[#1E1A18] p-6 shadow-sm">
              <h3 className="font-outfit text-base font-bold text-foreground">
                Our Concierge Guarantees
              </h3>
              <p className="mt-1 text-xs text-[#736862] dark:text-neutral-400">
                Premium experience tailored for every Fairu customer.
              </p>

              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#9E596B]/10 text-[#9E596B]">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Always Open & Accessible</h4>
                    <p className="text-[11px] text-[#736862] dark:text-neutral-400">Customer care open 24/7 everyday</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#9E596B]/10 text-[#9E596B]">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">100% Authentic Quality</h4>
                    <p className="text-[11px] text-[#736862] dark:text-neutral-400">Pure lawns, silks, and hand-embroidery</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#9E596B]/10 text-[#9E596B]">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Nationwide Express Delivery</h4>
                    <p className="text-[11px] text-[#736862] dark:text-neutral-400">Doorstep delivery across all districts</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#9E596B]/10 text-[#9E596B]">
                    <RotateCcw className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Hassle-Free 7-Day Returns</h4>
                    <p className="text-[11px] text-[#736862] dark:text-neutral-400">Easy size exchange & return policy</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Official Social Channels Card */}
            <div className="rounded-3xl border border-[#EBE4DF] dark:border-[#2E2825] bg-gradient-to-br from-white to-[#FDF9F8] dark:from-[#1E1A18] dark:to-[#171413] p-6 shadow-sm">
              <h3 className="font-outfit text-base font-bold text-foreground">
                Connect on Social Media
              </h3>
              <p className="mt-1 text-xs text-[#736862] dark:text-neutral-400">
                Follow our official accounts for new arrivals, styling reels, and exclusive drops.
              </p>

              <div className="mt-5 space-y-2.5">
                {/* Facebook */}
                <a
                  href="https://www.facebook.com/fairufashion"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border border-[#EBE4DF] dark:border-[#2E2825] bg-white dark:bg-[#25201E] px-4 py-3 text-xs font-semibold hover:border-[#1877F2]/50 hover:text-[#1877F2] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-[#1877F2]">
                      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
                    </svg>
                    <span>facebook.com/fairufashion</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-[#1877F2] group-hover:translate-x-1 transition-all" />
                </a>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/fairufashion"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border border-[#EBE4DF] dark:border-[#2E2825] bg-white dark:bg-[#25201E] px-4 py-3 text-xs font-semibold hover:border-[#E1306C]/50 hover:text-[#E1306C] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-[#E1306C]">
                      <rect x="3" y="3" width="18" height="18" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                    </svg>
                    <span>@fairufashion (Instagram)</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-[#E1306C] group-hover:translate-x-1 transition-all" />
                </a>

                {/* TikTok */}
                <a
                  href="https://www.tiktok.com/@fairufashion"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border border-[#EBE4DF] dark:border-[#2E2825] bg-white dark:bg-[#25201E] px-4 py-3 text-xs font-semibold hover:border-[#FE2C55]/50 hover:text-[#FE2C55] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-[#FE2C55]">
                      <path d="M19.6 6.7a5.1 5.1 0 0 1-3.1-1.1 5 5 0 0 1-1.8-3.1h-3.3v13a2.7 2.7 0 1 1-2.7-2.7c.27 0 .53.04.78.12V9.5a6 6 0 1 0 5.2 5.94V9.2a8.3 8.3 0 0 0 4.9 1.58V7.5a5 5 0 0 1-.1-.8z" />
                    </svg>
                    <span>@fairufashion (TikTok)</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-[#FE2C55] group-hover:translate-x-1 transition-all" />
                </a>
              </div>
            </div>

            {/* Quick Track Order Banner */}
            <div className="rounded-3xl border border-[#EBE4DF] dark:border-[#2E2825] bg-[#F7F2EF] dark:bg-[#201B19] p-6 text-center">
              <h4 className="font-outfit text-sm font-bold text-foreground">Already have an active order?</h4>
              <p className="mt-1 text-xs text-[#736862] dark:text-neutral-400">Track delivery status with your phone number.</p>
              <Link
                href="/track-order"
                className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-foreground px-5 py-2.5 text-xs font-bold text-background hover:bg-[#9E596B] hover:text-white transition-all"
              >
                <span>Track Your Order Now</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* 4. SHOPPER FAQ ACCORDION SECTION (ELIMINATES BLANK SPACE) */}
      <section className="border-t border-[#EBE4DF] dark:border-[#2A2422] bg-white/60 dark:bg-[#181412]/60 py-16 px-4 md:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[#9E596B]">Frequently Asked Questions</span>
            <h2 className="mt-2 font-outfit text-2xl font-black text-foreground sm:text-3xl">
              Quick Answers for Shoppers
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#736862] dark:text-neutral-400">
              Have questions about ordering, deliveries, or tailoring? Here are the most common inquiries.
            </p>
          </div>

          <div className="mt-10 space-y-3.5">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={faq.q}
                  className="overflow-hidden rounded-2xl border border-[#EBE4DF] dark:border-[#2E2825] bg-white dark:bg-[#1E1A18] transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-[#FAF7F5] dark:hover:bg-[#25201E]"
                  >
                    <span className="font-outfit text-sm font-bold text-foreground sm:text-base pr-4">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[#9E596B] transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-[#F0EAE6] dark:border-[#2E2825] px-5 py-4 text-xs sm:text-sm leading-relaxed text-[#736862] dark:text-neutral-300 bg-[#FCFAF8] dark:bg-[#1A1614]">
                      <p>{faq.a}</p>
                      {faq.link && (
                        <div className="mt-3">
                          <Link
                            href={faq.link.href}
                            className="inline-flex items-center gap-1 font-bold text-[#9E596B] hover:underline"
                          >
                            <span>{faq.link.text}</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}
