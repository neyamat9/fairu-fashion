"use client";

import { errorMessage } from "@/lib/api/client";
import { useAuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/lib/hooks/use-auth";
import { askQuestion, createReview, getQuestions, voteReview } from "@/lib/services/reviews.service";
import type { Product, Question, Review } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export interface ReviewStats {
  average: number;
  total: number;
  breakdown: Record<string, number>;
}

interface ProductTabsProps {
  product: Product;
  reviews: Review[];
  reviewStats: ReviewStats;
  questions: Question[];
}


// ── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const sz = size === "md" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${sz} ${
            star <= Math.floor(rating)
              ? "text-amber-400"
              : star - 0.5 <= rating
              ? "text-amber-400/60"
              : "text-muted-foreground/70"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// ── Specification tab: grey group header rows, then key / value rows ─────────
function SpecsTab({ product }: { product: Product }) {
  if (!product.specs || product.specs.length === 0) {
    return <p className="text-sm text-muted-foreground">No specifications available.</p>;
  }
  return (
    <div>
      <h2 className="mb-4 font-outfit text-lg font-extrabold uppercase tracking-tight text-foreground">Specifications</h2>
      <div className="overflow-hidden rounded border border-border">
        {product.specs.map((group) => (
          <div key={group.groupName}>
            <div className="border-b border-border bg-secondary px-4 py-3 text-sm font-bold text-foreground">{group.groupName}</div>
            {group.items.map((item) => (
              <div key={item.key} className="grid grid-cols-1 gap-0.5 border-b border-border/70 px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-4 even:bg-background/60">
                <span className="text-muted-foreground">{item.key}</span>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Description tab ──────────────────────────────────────────────────────────
function DescriptionTab({ product }: { product: Product }) {
  return (
    <div>
      <h2 className="mb-4 font-outfit text-lg font-extrabold uppercase tracking-tight text-foreground">Description</h2>
      <h3 className="mb-3 font-outfit text-base font-bold text-foreground">{product.name}</h3>
      <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">{product.description || product.shortDescription}</p>
      {product.pinnedSpecs.length > 0 && (
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {product.pinnedSpecs.map((spec) => (
            <li key={spec.label} className="flex items-center gap-3 rounded border border-border bg-background px-3.5 py-2.5 text-sm">
              <span className="h-1.5 w-1.5 shrink-0 bg-brand-orange" aria-hidden="true" />
              <span className="text-muted-foreground">{spec.label}:</span>
              <span className="font-semibold text-foreground">{spec.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Reviews Tab ──────────────────────────────────────────────────────────────
function ReviewsTab({
  product,
  initialReviews,
  stats,
}: {
  product: Product;
  initialReviews: Review[];
  stats: ReviewStats;
}) {
  const { user } = useAuth();
  const { openAuth } = useAuthModal();
  const router = useRouter();
  const reviews = initialReviews;
  const [submitting, setSubmitting] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, "helpful" | "not-helpful">>({});
  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [formComment, setFormComment] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [barsVisible, setBarsVisible] = useState(false);
  const barsRef = useRef<HTMLDivElement>(null);

  // Animate bars on mount
  useEffect(() => {
    const timer = setTimeout(() => setBarsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const avgRating = stats.average;

  // Star breakdown (counts come from the server, over all reviews)
  const breakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = Number(stats.breakdown[String(star)] ?? 0);
    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
    return { star, count, pct };
  });

  async function handleHelpful(reviewId: string, type: "helpful" | "not-helpful") {
    if (!user) {
      openAuth("login");
      return;
    }
    const prev = helpfulVotes[reviewId];
    const drop = (p: Record<string, "helpful" | "not-helpful">) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== reviewId)) as Record<string, "helpful" | "not-helpful">;
    setHelpfulVotes((p) => (prev === type ? drop(p) : { ...p, [reviewId]: type }));
    try {
      await voteReview(reviewId, type === "helpful");
    } catch (e) {
      toast.error(errorMessage(e));
      setHelpfulVotes((p) => (prev ? { ...p, [reviewId]: prev } : drop(p)));
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (formRating === 0) errors.rating = "Please select a rating";
    if (formComment.trim().length < 10) errors.comment = "Please write at least 10 characters";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await createReview({ productId: product.id, rating: formRating, title: formTitle.trim() || undefined, comment: formComment.trim() });
      setFormRating(0);
      setFormTitle("");
      setFormComment("");
      setFormErrors({});
      setShowForm(false);
      toast.success("Thanks! Your review is now live.", { duration: 3000 });
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Rating summary */}
      <div className="flex flex-col sm:flex-row gap-8 p-6 bg-muted border border-border rounded">
        {/* Average */}
        <div className="flex flex-col items-center justify-center gap-2 flex-shrink-0">
          <span className="text-foreground text-6xl font-black tracking-tighter">
            {avgRating.toFixed(1)}
          </span>
          <StarRating rating={avgRating} size="md" />
          <span className="text-muted-foreground/70 text-xs font-bold">
            {stats.total} review{stats.total !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Bar breakdown */}
        <div ref={barsRef} className="flex-1 space-y-2">
          {breakdown.map(({ star, count, pct }) => (
            <div key={star} className="flex items-center gap-3">
              <span className="text-muted-foreground/70 text-xs font-bold w-4 text-right flex-shrink-0">
                {star}
              </span>
              <svg className="w-3 h-3 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded transition-all duration-700 ease-out"
                  style={{ width: barsVisible ? `${pct}%` : "0%" }}
                />
              </div>
              <span className="text-muted-foreground/70 text-xs font-bold w-8 flex-shrink-0">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Write review toggle */}
      <div className="flex justify-end">
        {user ? (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="px-5 py-2.5 bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-border text-xs font-black uppercase tracking-widest rounded transition-all"
          >
            {showForm ? "Cancel" : "Write a Review"}
          </button>
        ) : (
          <button type="button" onClick={() => openAuth("login")} className="px-5 py-2.5 bg-muted border border-border text-muted-foreground hover:text-foreground text-xs font-black uppercase tracking-widest rounded transition-all">
            Log in to write a review
          </button>
        )}
      </div>

      {/* Review form */}
      {showForm && (
        <form
          onSubmit={handleSubmitReview}
          className="bg-muted border border-border rounded p-5 space-y-4 animate-fade-slide-up"
        >
          <h2 className="text-foreground font-black text-base uppercase tracking-tight font-outfit">
            Write a Review
          </h2>

          {/* Star selector */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 block mb-2">
              Rating *
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setFormRating(star)}
                  aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
                  className="transition-transform hover:scale-110"
                >
                  <svg
                    className={`w-7 h-7 transition-colors ${
                      star <= (hoverRating || formRating)
                        ? "text-amber-400"
                        : "text-muted-foreground/70"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
            {formErrors.rating && (
              <p className="text-red-400 text-xs mt-1">{formErrors.rating}</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label htmlFor="review-title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 block mb-2">
              Headline (optional)
            </label>
            <input
              id="review-title"
              type="text"
              maxLength={150}
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Sum it up in a few words"
              className="w-full h-10 bg-muted border border-border rounded px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-orange/40 transition-colors"
            />
          </div>

          {/* Comment */}
          <div>
            <label htmlFor="review-comment" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 block mb-2">
              Review *
            </label>
            <textarea
              id="review-comment"
              value={formComment}
              onChange={(e) => setFormComment(e.target.value)}
              placeholder="Share your experience with this product..."
              rows={4}
              className="w-full bg-muted border border-border rounded px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-orange/40 transition-colors resize-none"
            />
            {formErrors.comment && (
              <p className="text-red-400 text-xs mt-1">{formErrors.comment}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-primary text-white text-xs font-black uppercase tracking-tight rounded hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            Submit Review
          </button>
        </form>
      )}

      {/* Review list */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-muted-foreground/70 text-sm text-center py-8">
            No reviews yet. Be the first to review this product!
          </p>
        ) : (
          reviews.map((review) => {
            const vote = helpfulVotes[review.id];
            const helpfulCount =
              review.helpfulCount + (vote === "helpful" ? 1 : 0);
            const notHelpfulCount =
              review.notHelpfulCount + (vote === "not-helpful" ? 1 : 0);

            return (
              <div
                key={review.id}
                className="bg-muted border border-border rounded p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 mb-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                      <span className="text-foreground font-black text-sm break-words">
                        {review.reviewerName}
                      </span>
                      {review.verified && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                          Verified
                        </span>
                      )}
                    </div>
                    <StarRating rating={review.rating} />
                  </div>
                  <span className="text-muted-foreground/70 text-xs flex-shrink-0">
                    {new Date(review.date).toLocaleDateString("en-BD", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  {review.comment}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
                  <span>Helpful?</span>
                  <button
                    type="button"
                    onClick={() => handleHelpful(review.id, "helpful")}
                    className={`flex items-center gap-1 transition-colors ${
                      vote === "helpful"
                        ? "text-emerald-400"
                        : "hover:text-foreground"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                    {helpfulCount}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHelpful(review.id, "not-helpful")}
                    className={`flex items-center gap-1 transition-colors ${
                      vote === "not-helpful"
                        ? "text-red-400"
                        : "hover:text-foreground"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                    </svg>
                    {notHelpfulCount}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Q&A Tab ──────────────────────────────────────────────────────────────────
function QATab({
  product,
  initialQuestions,
}: {
  product: Product;
  initialQuestions: Question[];
}) {
  const { user } = useAuth();
  const { openAuth } = useAuthModal();
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [questionText, setQuestionText] = useState("");
  const [questionError, setQuestionError] = useState("");
  const [asking, setAsking] = useState(false);

  async function handleSubmitQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      openAuth("login");
      return;
    }
    if (questionText.trim().length < 5) {
      setQuestionError("Please enter your question (at least 5 characters)");
      return;
    }
    setAsking(true);
    try {
      await askQuestion(product.id, questionText.trim());
      setQuestions(await getQuestions(product.id));
      setQuestionText("");
      setQuestionError("");
      toast.success("Question submitted! We'll answer it soon.", { duration: 3000 });
    } catch (err) {
      setQuestionError(errorMessage(err));
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Ask form */}
      <form
        onSubmit={handleSubmitQuestion}
        className="bg-muted border border-border rounded p-5"
      >
        <h2 className="text-foreground font-black text-base uppercase tracking-tight font-outfit mb-3">
          Ask a Question
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="What would you like to know about this product?"
            className="h-10 w-full min-w-0 sm:flex-1 bg-muted border border-border rounded px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-orange/40 transition-colors"
            aria-label="Your question"
          />
          <button
            type="submit"
            className="px-5 h-10 w-full bg-primary text-white text-xs font-black uppercase tracking-tight rounded hover:bg-primary/90 transition-colors flex-shrink-0 sm:w-auto"
          >
            {asking ? "…" : "Ask"}
          </button>
        </div>
        {questionError && (
          <p className="text-red-400 text-xs mt-2">{questionError}</p>
        )}
      </form>

      {/* Q&A list */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <p className="text-muted-foreground/70 text-sm text-center py-8">
            No questions yet. Be the first to ask!
          </p>
        ) : (
          questions.map((q) => (
            <div
              key={q.id}
              className="bg-muted border border-border rounded p-5"
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded bg-brand-orange/20 text-accent-text text-[10px] font-black">
                  Q
                </span>
                <div>
                  <p className="text-foreground text-sm font-bold">{q.questionText}</p>
                  <p className="text-muted-foreground/70 text-[11px] mt-0.5">
                    {q.askerName} ·{" "}
                    {new Date(q.date).toLocaleDateString("en-BD", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              {q.answerText ? (
                <div className="flex items-start gap-3 ml-9">
                  <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black">
                    A
                  </span>
                  <div>
                    <p className="text-foreground/80 text-sm">{q.answerText}</p>
                    {q.answererName && (
                      <p className="text-muted-foreground/70 text-[11px] mt-0.5">
                        {q.answererName}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="ml-9">
                  <p className="text-muted-foreground/70 text-xs italic">
                    Answer pending...
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── In the Box Tab ───────────────────────────────────────────────────────────
function InTheBoxTab({ product }: { product: Product }) {
  if (!product.inTheBox || product.inTheBox.length === 0) {
    return (
      <p className="text-muted-foreground/70 text-sm">
        Package contents not available.
      </p>
    );
  }
  return (
    <div>
      <h2 className="text-foreground font-black text-lg uppercase tracking-tight font-outfit mb-4">
        What&apos;s in the Box
      </h2>
      <ul className="space-y-3">
        {product.inTheBox.map((item, idx) => (
          <li
            key={idx}
            className="flex items-center gap-3 text-sm text-foreground/80 bg-muted border border-border rounded px-4 py-3"
          >
            <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded bg-brand-orange/10 text-accent-text text-[10px] font-black">
              {idx + 1}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main Export ──────────────────────────────────────────────────────────────
export default function ProductTabs({ product, reviews, reviewStats, questions }: ProductTabsProps) {
  const sections = [
    { id: "specification", label: "Specification", show: product.specs.length > 0 },
    { id: "description", label: "Description", show: true },
    { id: "reviews", label: `Reviews(${reviewStats.total || reviews.length})`, show: true },
    { id: "qa", label: questions.length > 0 ? `Q&A(${questions.length})` : "Q&A", show: true },
    { id: "in-the-box", label: "In the Box", show: product.inTheBox.length > 0 },
  ].filter((x) => x.show);

  const [active, setActive] = useState(sections[0]?.id ?? "");
  const lock = useRef(0); // while a tab-click scroll is running, don't let scroll-spy fight it
  const bar = useRef<HTMLDivElement>(null);

  // on a phone the tab bar scrolls sideways: keep the current tab in view
  useEffect(() => {
    const el = bar.current;
    const tab = el?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!el || !tab || el.scrollWidth <= el.clientWidth) return;
    el.scrollTo({ left: Math.max(0, tab.offsetLeft - 12), behavior: "smooth" });
  }, [active]);

  // scroll-spy: highlight the section currently under the sticky bars
  useEffect(() => {
    const els = sections.map((x) => document.getElementById(x.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const onScroll = () => {
      if (Date.now() < lock.current) return;
      const line = offset() + 24;
      let cur = els[0].id;
      for (const el of els) if (el.getBoundingClientRect().top <= line) cur = el.id;
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.length]);

  /** how much of the top of the screen the sticky navbar + tab bar cover */
  function offset(goingUp = false) {
    // scrolling up brings the full header back, so reserve room for it
    const css = getComputedStyle(document.documentElement);
    const sticky = parseFloat(css.getPropertyValue(goingUp ? "--chrome-full" : "--sticky-top")) || 88;
    const bar = document.getElementById("product-tabbar")?.offsetHeight ?? 56;
    return sticky - 16 + bar;
  }

  function jump(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    setActive(id);
    lock.current = Date.now() + 1400;
    const rawTop = el.getBoundingClientRect().top + window.scrollY;
    const goingUp = rawTop - offset() - 8 < window.scrollY;
    const y = rawTop - offset(goingUp) - 8;
    const lenis = (window as unknown as { __lenis?: { scrollTo: (n: number, o?: object) => void } }).__lenis;
    if (lenis) lenis.scrollTo(y, { duration: 1.1 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  }

  const block = "border-b border-border p-4 last:border-b-0 sm:p-6";

  return (
    <div>
      {/* Jump bar — stays pinned under the navbar; clicking scrolls to that section */}
      <div
        id="product-tabbar"
        role="tablist"
        aria-label="Jump to a section"
        ref={bar}
        className="no-scrollbar sticky z-30 flex overflow-x-auto rounded-t border-b border-border bg-card/98 backdrop-blur-md px-1 transition-[top] duration-300 ease-out max-sm:pr-8 max-sm:[mask-image:linear-gradient(to_right,#000_calc(100%-28px),transparent)] sm:px-4 shadow-xs"
        style={{ top: "var(--navbar-height, 0px)" }}
      >
        {sections.map((t) => {
          const on = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => jump(t.id)}
              className={`relative shrink-0 px-3 py-3.5 text-[13px] font-semibold transition-colors sm:px-5 sm:py-4 sm:text-sm ${on ? "text-primary dark:text-brand-blue" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t.label}
              <span
                className={`absolute inset-x-3 bottom-0 h-0.5 origin-left bg-brand-orange transition-transform duration-300 ${on ? "scale-x-100" : "scale-x-0"}`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      {/* Every section, one under another */}
      {product.specs.length > 0 && (
        <section id="specification" className={block}>
          <SpecsTab product={product} />
        </section>
      )}
      <section id="description" className={block}>
        <DescriptionTab product={product} />
      </section>
      <section id="reviews" className={block}>
        <ReviewsTab product={product} initialReviews={reviews} stats={reviewStats} />
      </section>
      <section id="qa" className={block}>
        <QATab product={product} initialQuestions={questions} />
      </section>
      {product.inTheBox.length > 0 && (
        <section id="in-the-box" className={block}>
          <InTheBoxTab product={product} />
        </section>
      )}
    </div>
  );
}
