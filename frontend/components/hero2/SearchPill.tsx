"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, Search } from "lucide-react";

export const SearchPill: React.FC = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/browse?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/browse");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={`relative w-full max-w-[340px] sm:max-w-[380px] h-[52px] bg-white rounded-full flex items-center px-4 pl-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-neutral-100 transition-all duration-300 ease-out z-30 ${
        isFocused ? "scale-x-[1.04] shadow-[0_12px_36px_rgba(0,0,0,0.12)] border-neutral-200 ring-2 ring-rose-300/40" : ""
      }`}
    >
      <Search className="w-[18px] h-[18px] text-neutral-400 mr-2 flex-shrink-0" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="What are you looking for?"
        className="w-full bg-transparent text-[14px] text-neutral-800 placeholder-neutral-400 font-poppins focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Filter search"
        className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 hover:text-neutral-900 transition-colors flex-shrink-0 ml-1"
      >
        <SlidersHorizontal className="w-4 h-4" />
      </button>
    </form>
  );
};
