import { useEffect } from "react";
import { collection, getDocs, getDoc, doc, query, where } from "firebase/firestore";
import { useLocation } from "react-router-dom";
import { db } from "../firebase";

export const SITE_URL = "https://online-academy-plum.vercel.app";
const SITE_NAME = "Online Academy";
const DEFAULT_TITLE = "Online Academy | Learn. Grow. Succeed.";
const DEFAULT_DESCRIPTION = "Discover structured online courses, practical lessons, assessments, progress tracking and professional certificates with Online Academy.";
const DEFAULT_IMAGE = `${SITE_URL}/favicon.svg`;

const text = (value, fallback = "") => {
  if (value == null) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") return text(value.url ?? value.src ?? value.value ?? value.name ?? value.title, fallback);
  return fallback;
};

const courseTitle = (course) => text(course?.title ?? course?.name, "Online Course");
const courseDescription = (course) => text(course?.description, "Learn practical skills through structured online lessons, assessments and a clear completion path.");
const absoluteUrl = (value) => {
  const raw = text(value);
  if (!raw) return DEFAULT_IMAGE;
  try { return new URL(raw, SITE_URL).href; } catch { return DEFAULT_IMAGE; }
};
const courseImage = (course) => absoluteUrl(course?.imageUrl ?? course?.imageURL ?? course?.thumbnailUrl ?? course?.thumbnailURL ?? course?.thumbnail ?? course?.image ?? course?.courseImage ?? course?.coverImage ?? course?.bannerImage ?? course?.coverUrl ?? course?.bannerUrl);

function setMeta(name, content, property = false) {
  if (!content) return;
  const attr = property ? "property" : "name";
  let node = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attr, name);
    document.head.appendChild(node);
  }
  node.setAttribute("content", content);
}

function setLink(rel, href) {
  let node = document.head.querySelector(`link[rel="${rel}"]`);
  if (!node) {
    node = document.createElement("link");
    node.setAttribute("rel", rel);
    document.head.appendChild(node);
  }
  node.setAttribute("href", href);
}

function setJsonLd(id, data) {
  let node = document.head.querySelector(`script[data-oa-jsonld="${id}"]`);
  if (!node) {
    node = document.createElement("script");
    node.type = "application/ld+json";
    node.setAttribute("data-oa-jsonld", id);
    document.head.appendChild(node);
  }
  node.textContent = JSON.stringify(data);
}

function isPrivatePath(pathname) {
  return [
    "/dashboard", "/profile", "/checkout", "/payment", "/admin", "/admin-login",
    "/login", "/register", "/forgot-password", "/reset-password", "/verify-email",
    "/certificate",
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function baseStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "EducationalOrganization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        logo: { "@type": "ImageObject", url: DEFAULT_IMAGE },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en-PK",
      },
    ],
  };
}

export default function SEO() {
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    const pathname = location.pathname.replace(/\/+$/, "") || "/";
    const courseMatch = pathname.match(/^\/courses\/([^/]+)$/);
    const privatePage = isPrivatePath(pathname);

    const apply = ({ title = DEFAULT_TITLE, description = DEFAULT_DESCRIPTION, image = DEFAULT_IMAGE, canonical = `${SITE_URL}${pathname === "/" ? "/" : pathname}`, keywords = "online courses, online learning, professional certificates, Online Academy", jsonLd = baseStructuredData(), noindex = privatePage } = {}) => {
      if (cancelled) return;
      document.title = title;
      setMeta("description", description);
      setMeta("keywords", keywords);
      setMeta("robots", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
      setMeta("author", SITE_NAME);
      setMeta("theme-color", "#2563eb");
      setMeta("og:type", "website", true);
      setMeta("og:site_name", SITE_NAME, true);
      setMeta("og:title", title, true);
      setMeta("og:description", description, true);
      setMeta("og:url", canonical, true);
      setMeta("og:image", image, true);
      setMeta("og:image:alt", title, true);
      setMeta("og:locale", "en_PK", true);
      setMeta("twitter:card", "summary_large_image");
      setMeta("twitter:title", title);
      setMeta("twitter:description", description);
      setMeta("twitter:image", image);
      setLink("canonical", canonical);
      setJsonLd("main", jsonLd);
    };

    if (privatePage) {
      apply({ title: pathname.startsWith("/admin") ? "Administration | Online Academy" : DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, noindex: true });
      return () => { cancelled = true; };
    }

    const load = async () => {
      if (courseMatch) {
        const courseId = decodeURIComponent(courseMatch[1]);
        try {
          const snap = await getDoc(doc(db, "courses", courseId));
          if (!snap.exists()) throw new Error("Course not found");
          const course = { id: snap.id, ...snap.data() };
          const title = courseTitle(course);
          const description = courseDescription(course);
          const canonical = `${SITE_URL}/courses/${encodeURIComponent(course.id)}`;
          const image = courseImage(course);
          const jsonLd = {
            "@context": "https://schema.org",
            "@graph": [
              ...baseStructuredData()["@graph"],
              {
                "@type": "BreadcrumbList",
                "itemListElement": [
                  { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
                  { "@type": "ListItem", position: 2, name: "Courses", item: `${SITE_URL}/courses` },
                  { "@type": "ListItem", position: 3, name: title, item: canonical },
                ],
              },
              {
                "@type": "Course",
                "@id": `${canonical}#course`,
                name: title,
                description,
                url: canonical,
                image: [image],
                provider: { "@type": "EducationalOrganization", name: SITE_NAME, url: `${SITE_URL}/` },
                educationalLevel: text(course.level, "All Levels"),
                inLanguage: text(course.language, "English"),
              },
            ],
          };
          apply({ title: `${title} | Online Academy`, description, image, canonical, keywords: `${title}, ${text(course.category, "online course")}, online course, learn online, Online Academy`, jsonLd });
        } catch {
          apply({ title: "Course | Online Academy", description: DEFAULT_DESCRIPTION, canonical: `${SITE_URL}${pathname}` });
        }
        return;
      }

      if (pathname === "/courses") {
        try {
          const snap = await getDocs(query(collection(db, "courses"), where("published", "==", true)));
          const courses = snap.docs.map((item) => ({ id: item.id, ...item.data() })).filter((course) => course.published === true);
          const items = courses.map((course, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${SITE_URL}/courses/${encodeURIComponent(course.id)}`,
            item: {
              "@type": "Course",
              name: courseTitle(course),
              description: courseDescription(course),
              provider: { "@type": "EducationalOrganization", name: SITE_NAME, url: `${SITE_URL}/` },
            },
          }));
          const jsonLd = { "@context": "https://schema.org", "@graph": [...baseStructuredData()["@graph"], { "@type": "ItemList", name: "Online Academy Courses", itemListElement: items }] };
          apply({ title: "Online Courses | Free & Paid Courses | Online Academy", description: "Explore Online Academy's free and premium online courses. Learn practical skills through structured lessons, assessments and certificate pathways.", keywords: "online courses, free online courses, paid courses, courses in Pakistan, online learning Pakistan, professional certificates, Online Academy", jsonLd });
        } catch {
          apply({ title: "Online Courses | Online Academy", description: "Explore free and premium online courses with structured lessons and professional certificate pathways." });
        }
        return;
      }

      if (pathname === "/verify-certificate") {
        apply({ title: "Verify Certificate | Online Academy", description: "Verify an Online Academy certificate using its unique certificate ID.", keywords: "certificate verification, verify certificate, Online Academy certificate" });
        return;
      }

      apply();
    };

    load();
    return () => { cancelled = true; };
  }, [location.pathname, location.search]);

  return null;
}
