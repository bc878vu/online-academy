import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  Code2,
  GraduationCap,
  Laptop,
  Palette,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import heroImage from "../assets/hero.png";
import { auth, db } from "../firebase";

const COURSE_COLLECTION = "courses";

const benefits = [
  [BookOpen, "Quality Courses", "Learn through structured courses with lessons, resources and practical learning material."],
  [Laptop, "Learn Anywhere", "Access your learning materials from your phone, tablet or computer whenever you need them."],
  [BarChart3, "Track Progress", "Monitor your learning journey, completed lessons and achievements from your dashboard."],
];

const steps = [
  [Users, "Create an Account", "Set up your profile and access your personal learning area."],
  [BookOpen, "Choose a Course", "Explore the available courses and select what you want to learn."],
  [PlayCircle, "Start Learning", "Complete lessons, follow your progress and keep improving your skills."],
];

const categoryIcons = [Code2, TrendingUp, BookOpen, Palette, Target];

function Home() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const isLoggedIn = Boolean(auth.currentUser);

  useEffect(() => {
    let mounted = true;

    getDocs(collection(db, COURSE_COLLECTION))
      .then((snap) => {
        if (!mounted) return;
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((course) => course.published !== false);

        setCourses(rows);
      })
      .catch((err) => console.error("Home courses:", err))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const visibleCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;

    return courses.filter((course) =>
      [course.title, course.category, course.description, course.level]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [courses, search]);

  const categories = useMemo(() => {
    const map = new Map();

    courses.forEach((course) => {
      const name = String(course.category || "").trim();
      if (!name) return;
      map.set(name, (map.get(name) || 0) + 1);
    });

    return [...map.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([name, count], index) => ({
        name,
        count,
        Icon: categoryIcons[index % categoryIcons.length],
      }));
  }, [courses]);

  const popularCourses = useMemo(() => {
    const rows = [...visibleCourses];

    rows.sort((a, b) => {
      const aScore = Number(a.enrolledCount ?? a.studentsCount ?? a.enrollments ?? 0);
      const bScore = Number(b.enrolledCount ?? b.studentsCount ?? b.enrollments ?? 0);
      return bScore - aScore;
    });

    return rows.slice(0, 4);
  }, [visibleCourses]);

  const lessons = useMemo(
    () => courses.reduce((total, course) => total + (Array.isArray(course.lessons) ? course.lessons.length : 0), 0),
    [courses]
  );

  const stats = [
    [BookOpen, courses.length, "Courses"],
    [Users, courses.reduce((total, course) => total + Number(course.enrolledCount ?? course.studentsCount ?? 0), 0), "Students"],
    [PlayCircle, lessons, "Lessons"],
    [Clock3, "24/7", "Access"],
  ];

  return (
    <main className="overflow-hidden bg-slate-50 text-slate-900">
      {/* HERO */}
      <section className="relative overflow-hidden bg-[#061b3d] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(37,99,235,.32),transparent_32%),radial-gradient(circle_at_90%_25%,rgba(59,130,246,.20),transparent_30%),linear-gradient(135deg,#06152f,#082858_58%,#061b3d)]" />
        <div className="absolute -right-32 top-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -left-40 bottom-0 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-[.92fr_1.08fr] lg:gap-12">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-blue-200">
                <Sparkles size={14} />
                Learn Without Limits
              </div>

              <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Learn new skills.
                <span className="mt-2 block bg-gradient-to-r from-blue-300 via-blue-400 to-indigo-200 bg-clip-text text-transparent">
                  Build your future.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                Explore structured courses, build practical knowledge and track your progress with a simple learning experience designed for students.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/courses"
                  className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold shadow-xl shadow-blue-950/40 transition hover:-translate-y-0.5 hover:bg-blue-500"
                >
                  Explore Courses
                  <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to={isLoggedIn ? "/dashboard" : "/register"}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-bold backdrop-blur transition hover:bg-white/10"
                >
                  {isLoggedIn ? "Go to Dashboard" : "Create Account"}
                  <ArrowRight size={17} />
                </Link>
              </div>

              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
                {["Structured Learning", "Learn at Your Pace", "Progress Tracking"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-blue-300" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-2xl lg:justify-self-end">
              <div className="absolute -right-5 top-10 z-20 hidden rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-xl backdrop-blur md:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-200">
                    <PlayCircle size={19} />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Video Lessons</p>
                    <p className="text-[10px] text-slate-300">Learn anytime</p>
                  </div>
                </div>
              </div>

              <div className="absolute -left-4 top-28 z-20 hidden rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-xl backdrop-blur md:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-200">
                    <Award size={19} />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Certificates</p>
                    <p className="text-[10px] text-slate-300">Show your achievement</p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-2 shadow-2xl backdrop-blur">
                <div className="relative overflow-hidden rounded-[1.6rem] bg-slate-100">
                  <img
                    src={heroImage}
                    alt="Online Academy student learning"
                    className="h-[300px] w-full object-cover object-center sm:h-[380px] lg:h-[430px]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#06152f]/55 via-transparent to-transparent" />

                  <div className="absolute bottom-4 right-4 rounded-2xl border border-white/20 bg-white/95 p-4 text-slate-900 shadow-2xl backdrop-blur sm:bottom-6 sm:right-6 sm:min-w-[190px]">
                    <div className="flex items-center justify-between gap-6">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Your Progress</p>
                        <p className="mt-1 text-2xl font-black text-blue-700">Keep going</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                        <TrendingUp size={20} />
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full w-3/4 rounded-full bg-blue-600" />
                    </div>
                    <p className="mt-1 text-[10px] font-semibold text-slate-500">Continue your learning journey</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-20 mx-auto mt-8 max-w-5xl rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
            <form onSubmit={(event) => event.preventDefault()} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <Search size={20} className="shrink-0 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search for courses, skills or topics..."
                className="w-full bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                aria-label="Search courses"
              />
              <Link to="/courses" className="hidden shrink-0 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 sm:block">
                Search
              </Link>
            </form>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="relative z-30 -mt-1 px-5 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:grid-cols-4">
          {stats.map(([Icon, value, label], index) => (
            <div key={label} className={`flex items-center gap-3 px-4 py-5 sm:justify-center sm:px-6 ${index > 1 ? "border-t sm:border-t-0" : ""} ${index % 2 ? "border-l" : ""} sm:border-l ${index === 0 ? "sm:border-l-0" : ""}`}>
              <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 sm:flex"><Icon size={19} /></div>
              <div><p className="text-xl font-black">{loading ? "…" : value || "—"}</p><p className="text-[11px] font-semibold text-slate-500 sm:text-xs">{label}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="px-5 pb-8 pt-16 sm:px-6 lg:px-8 lg:pt-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-blue-700">Browse Top Categories</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Explore by category</h2>
              <p className="mt-3 text-slate-600">Choose from the learning areas currently available in the academy.</p>
            </div>
            <Link to="/courses" className="inline-flex w-fit items-center gap-2 text-sm font-extrabold text-blue-700">View all courses <ArrowRight size={17} /></Link>
          </div>

          {categories.length ? (
            <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {categories.map(({ name, count, Icon }) => (
                <Link key={name} to={`/courses?category=${encodeURIComponent(name)}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white"><Icon size={24} /></div>
                  <h3 className="mt-5 line-clamp-2 min-h-[48px] font-black">{name}</h3>
                  <p className="mt-2 text-xs font-semibold text-slate-500">{count} {count === 1 ? "course" : "courses"}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-700">Explore <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-9 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <BookOpen className="mx-auto text-slate-400" size={30} />
              <p className="mt-3 font-bold text-slate-700">{loading ? "Loading learning categories..." : "Courses will appear here soon."}</p>
              <p className="mt-1 text-sm text-slate-500">This section uses live course data and does not display placeholder categories.</p>
            </div>
          )}
        </div>
      </section>

      {/* COURSES */}
      <section className="px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-blue-700">Available Courses</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{search ? "Search results" : "Start learning today"}</h2>
              <p className="mt-3 text-slate-600">{search ? `${visibleCourses.length} matching ${visibleCourses.length === 1 ? "course" : "courses"} found.` : "Explore the latest published courses from Online Academy."}</p>
            </div>
            <Link to="/courses" className="inline-flex w-fit items-center gap-2 text-sm font-extrabold text-blue-700">View all courses <ArrowRight size={17} /></Link>
          </div>

          {popularCourses.length ? (
            <div className="mt-9 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {popularCourses.map((course) => (
                <Link key={course.id} to={`/courses/${course.id}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl">
                  <div className="relative h-44 overflow-hidden bg-gradient-to-br from-[#0b3b8f] via-blue-700 to-[#06152f]">
                    {course.imageUrl ? (
                      <img src={course.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <>
                        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-300/20 blur-2xl" />
                        <div className="absolute -bottom-10 left-1/4 h-32 w-32 rounded-full bg-indigo-300/20 blur-2xl" />
                        <GraduationCap className="absolute bottom-5 left-5 text-white/80" size={42} />
                      </>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/70 to-transparent" />
                    <div className="absolute left-4 top-4"><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">{course.category || "Learning"}</span></div>
                    <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur"><Star size={16} /></div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-blue-700">{course.level || "All Levels"}</span>
                      <span className="flex items-center gap-1 text-slate-500"><Clock3 size={13} />{course.duration || `${Array.isArray(course.lessons) ? course.lessons.length : 0} lessons`}</span>
                    </div>
                    <h3 className="mt-3 line-clamp-2 min-h-[56px] text-lg font-black">{course.title || "Untitled course"}</h3>
                    <p className="mt-2 line-clamp-2 min-h-[48px] text-sm leading-6 text-slate-600">{course.description || "Open this course to view its available learning material."}</p>
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-extrabold text-blue-700"><span>Explore course</span><ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-9 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <BookOpen className="mx-auto text-slate-400" size={34} />
              <h3 className="mt-4 text-lg font-black">{loading ? "Loading courses..." : "No courses found"}</h3>
              <p className="mt-2 text-sm text-slate-500">{search ? "Try another course name, topic or category." : "Published courses will appear here automatically when they are added."}</p>
              {search && <button type="button" onClick={() => setSearch("")} className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Clear search</button>}
            </div>
          )}
        </div>
      </section>

      {/* WHY ONLINE ACADEMY */}
      <section className="border-y border-slate-200 bg-white px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-black uppercase tracking-[.2em] text-blue-700">Why Online Academy</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Everything you need to learn</h2>
            <p className="mt-4 leading-7 text-slate-600">A simple and organized learning experience designed to help students learn effectively.</p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {benefits.map(([Icon, title, text]) => (
              <div key={title} className="group rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white"><Icon size={22} /></div>
                <h3 className="mt-5 text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-[#06152f] px-5 py-16 text-white sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-black uppercase tracking-[.2em] text-blue-300">How It Works</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Start learning in three simple steps</h2>
            <p className="mt-4 text-slate-300">Getting started with Online Academy is simple.</p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map(([Icon, title, text], index) => (
              <div key={title} className="relative rounded-2xl border border-white/10 bg-white/[.05] p-6 backdrop-blur">
                <span className="absolute right-5 top-4 text-4xl font-black text-white/[.05]">0{index + 1}</span>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/20 text-blue-300"><Icon size={22} /></div>
                <h3 className="mt-5 text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 py-12 text-white shadow-2xl sm:px-10 lg:px-14">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-indigo-300/10 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-sm font-bold text-blue-100"><GraduationCap size={18} /> Keep moving forward</div>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">Ready to start your learning journey?</h2>
              <p className="mt-3 leading-7 text-blue-100">Explore the academy, choose a course and keep building the skills that matter to you.</p>
            </div>
            <Link to={isLoggedIn ? "/dashboard" : "/courses"} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-black text-blue-700 shadow-xl transition hover:-translate-y-0.5 hover:bg-blue-50">
              {isLoggedIn ? "Open Dashboard" : "Browse Courses"}
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
