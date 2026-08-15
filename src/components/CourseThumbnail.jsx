import { useEffect, useMemo, useState } from "react";
import { BookOpen, PlayCircle } from "lucide-react";
import "../pages/certificate.css";

const text = (value) => {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") return text(value.url ?? value.src ?? value.value ?? value.name ?? value.title);
  return "";
};

const sourcesFor = (course) => {
  const values = [
    course?.imageUrl, course?.imageURL, course?.image,
    course?.thumbnailUrl, course?.thumbnailURL, course?.thumbnail,
    course?.thumbnailDataUrl, course?.courseImage, course?.coverImage,
    course?.bannerImage, course?.coverUrl, course?.bannerUrl,
  ];
  if (Array.isArray(course?.lessons)) {
    [...course.lessons]
      .sort((a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0))
      .forEach((lesson) => values.push(
        lesson?.thumbnailUrl, lesson?.thumbnailURL, lesson?.thumbnail,
        lesson?.imageUrl, lesson?.imageURL, lesson?.image, lesson?.coverImage,
      ));
  }
  return [...new Set(values.map(text).filter(Boolean))];
};

function fallbackDataUrl(title, category) {
  const safeTitle = text(title) || "Online Course";
  const safeCategory = text(category) || "Online Academy";
  const initials = safeTitle.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "OA";
  const escape = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0f3ea8"/><stop offset=".52" stop-color="#3159e8"/><stop offset="1" stop-color="#5b21b6"/></linearGradient><radialGradient id="r"><stop stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="1280" height="720" fill="url(#g)"/><circle cx="1040" cy="80" r="330" fill="url(#r)"/><circle cx="180" cy="650" r="250" fill="#fff" opacity=".035"/><rect x="58" y="58" width="1164" height="604" rx="36" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="2"/><g fill="#fff"><circle cx="640" cy="260" r="72" opacity=".13"/><text x="640" y="292" text-anchor="middle" font-family="Arial, sans-serif" font-size="92" font-weight="800">${escape(initials)}</text><text x="88" y="490" font-family="Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="4" opacity=".78">${escape(safeCategory.toUpperCase().slice(0, 34))}</text><text x="88" y="555" font-family="Arial, sans-serif" font-size="48" font-weight="800">${escape(safeTitle.slice(0, 34))}</text><text x="88" y="602" font-family="Arial, sans-serif" font-size="22" opacity=".75">ONLINE ACADEMY • LEARN AT YOUR PACE</text></g></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function CourseThumbnail({ course, className = "", priority = false, showPlay = false }) {
  const sources = useMemo(() => sourcesFor(course), [course]);
  const fallback = useMemo(() => fallbackDataUrl(course?.title || course?.name, course?.category), [course?.title, course?.name, course?.category]);
  const allSources = useMemo(() => [...sources, fallback], [sources, fallback]);
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [course?.id, allSources.join("|")]);
  const source = allSources[Math.min(index, allSources.length - 1)] || fallback;

  return <div className={`relative h-full w-full overflow-hidden bg-slate-950 ${className}`}>
    <img
      src={source}
      alt={text(course?.title || course?.name) || "Online course"}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      referrerPolicy="no-referrer"
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      onError={() => setIndex((current) => Math.min(current + 1, allSources.length - 1))}
      className="h-full w-full object-cover object-center transition duration-500"
    />
    {!sources.length && <div className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/15 bg-slate-950/55 px-2 py-1 text-[9px] font-black text-white/80 backdrop-blur"> <BookOpen size={11} /> Course cover</div>}
    {showPlay && <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/65 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur-md"><PlayCircle size={12} /> Learn at your pace</span>}
  </div>;
}

export { fallbackDataUrl, sourcesFor };
