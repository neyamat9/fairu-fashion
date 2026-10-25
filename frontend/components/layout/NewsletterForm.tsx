"use client";

import { errorMessage } from "@/lib/api/client";
import { subscribeNewsletter } from "@/lib/services/support.service";
import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function NewsletterForm({ variant = "default" }: { variant?: "default" | "bar" }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await subscribeNewsletter(email.trim(), "footer");
      toast.success("You're subscribed. Welcome aboard!");
      setEmail("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (variant === "bar") {
    // wide subscribe bar that straddles the top edge of the footer
    return (
      <form onSubmit={submit} className="flex items-center gap-2 rounded border border-border bg-card p-1.5 shadow-xl">
        <label htmlFor="newsletter-email" className="sr-only">Email address</label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email address"
          className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="flex h-11 shrink-0 items-center gap-2 rounded bg-brand-orange px-5 text-xs font-extrabold uppercase tracking-wider text-on-orange transition-all hover:brightness-105 active:scale-95 disabled:opacity-60"
        >
          <span>Subscribe</span>
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="relative">
      <label htmlFor="newsletter-email" className="sr-only">Email address</label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email for offers & updates"
        className="h-12 w-full rounded border border-white/20 bg-white/10 pl-4 pr-14 text-sm text-white placeholder:text-white/50 focus:border-brand-orange focus:outline-none"
      />
      <button
        type="submit"
        disabled={busy}
        aria-label="Subscribe"
        className="absolute right-1.5 top-1/2 flex h-9 w-10 -translate-y-1/2 items-center justify-center rounded bg-brand-orange text-on-orange transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
