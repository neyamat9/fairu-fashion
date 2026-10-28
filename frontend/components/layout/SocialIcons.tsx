import type { SiteSettings } from "@/lib/services/site.service";

type IconProps = { className?: string };

const Facebook = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
  </svg>
);
const Instagram = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const Whatsapp = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.25-1.38A9.92 9.92 0 1 0 12.04 2zm0 1.8a8.12 8.12 0 0 1 6.9 12.4 8.1 8.1 0 0 1-10.9 2.7l-.3-.18-3.1.82.83-3.03-.2-.31A8.12 8.12 0 0 1 12.04 3.8zM8.6 7.5c-.2 0-.5.07-.75.35-.26.28-1 1-1 2.43s1.03 2.8 1.17 3c.14.2 2 3.2 4.95 4.35 2.45.97 2.95.78 3.48.73.53-.05 1.7-.7 1.94-1.37.24-.67.24-1.25.17-1.37-.07-.12-.26-.2-.55-.34-.28-.15-1.7-.84-1.96-.93-.26-.1-.46-.15-.65.14-.2.28-.74.93-.9 1.12-.17.2-.33.22-.62.07-.28-.14-1.2-.44-2.28-1.4-.85-.76-1.42-1.7-1.58-1.98-.17-.29-.02-.44.12-.58.13-.13.28-.33.43-.5.14-.17.2-.28.28-.47.1-.2.05-.36-.02-.5-.07-.15-.64-1.58-.9-2.16-.23-.5-.47-.5-.65-.5z" />
  </svg>
);
const Tiktok = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.6 6.7a5.1 5.1 0 0 1-3.1-1.1 5 5 0 0 1-1.8-3.1h-3.3v13a2.7 2.7 0 1 1-2.7-2.7c.27 0 .53.04.78.12V9.5a6 6 0 1 0 5.2 5.94V9.2a8.3 8.3 0 0 0 4.9 1.58V7.5a5 5 0 0 1-.1-.8z" />
  </svg>
);

const NETWORKS = [
  { key: "facebook", label: "Facebook", Icon: Facebook, hover: "hover:bg-[#1877f2]" },
  { key: "whatsapp", label: "WhatsApp", Icon: Whatsapp, hover: "hover:bg-[#25d366]" },
  { key: "tiktok", label: "TikTok", Icon: Tiktok, hover: "hover:bg-[#fe2c55]" },
  { key: "instagram", label: "Instagram", Icon: Instagram, hover: "hover:bg-[#e1306c]" },
] as const;

export default function SocialIcons({ settings, variant = "icons" }: { settings: SiteSettings; variant?: "icons" | "list" }) {
  const s = settings.site;
  const href = (key: string) => {
    if (key === "whatsapp") {
      const num = (s.whatsapp ?? "01620490985").replace(/[^\d]/g, "");
      const full = num.startsWith("88") ? num : (num.startsWith("0") ? `88${num}` : `880${num}`);
      return s.socialLinks?.whatsapp || `https://wa.me/${full}`;
    }
    if (key === "facebook") {
      return s.socialLinks?.facebook || "https://www.facebook.com/fairufashion";
    }
    if (key === "instagram") {
      return s.socialLinks?.instagram || "https://www.instagram.com/fairufashion";
    }
    if (key === "tiktok") {
      return s.socialLinks?.tiktok || "https://www.tiktok.com/@fairufashion";
    }
    return s.socialLinks?.[key] || "#";
  };
  if (variant === "list") {
    return (
      <ul className="space-y-3">
        {NETWORKS.map(({ key, label, Icon }) => (
          <li key={key}>
            <a
              href={href(key)}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 text-sm text-white/70 transition-all hover:translate-x-1 hover:text-brand-orange"
            >
              <Icon className="h-4 w-4 shrink-0 text-white/50 transition-colors group-hover:text-brand-orange" />
              {label}
            </a>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2.5">
      {NETWORKS.map(({ key, label, Icon, hover }) => (
        <li key={key}>
          <a
            href={href(key)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className={`flex h-11 w-11 items-center justify-center rounded border border-white/20 text-white/85 transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:text-white ${hover}`}
          >
            <Icon className="h-5 w-5" />
          </a>
        </li>
      ))}
    </ul>
  );
}
