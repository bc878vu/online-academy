import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  GraduationCap,
  User,
  BookOpen,
  ArrowRight,
  BarChart3,
  Clock3,
  Award,
  ChevronRight,
  PlayCircle,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { auth, db } from "../firebase";

const CACHE_KEY = "online_academy_dashboard_v1";
const CACHE_TTL = 2 * 60 * 1000;

function getTimestampValue(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function safeText(value, fallback = "") {
  if (value == null) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const text = value.map((item) => safeText(item)).filter(Boolean).join(", ");
    return text || fallback;
  }
  if (typeof value === "object") {
    return safeText(
      value.label ?? value.name ?? value.title ?? value.text ?? value.value ?? value.displayName,
      fallback
    );
  }
  return fallback;
}

function getCourseTitle(course) {
  return safeText(course?.title ?? course?.name, "Untitled Course");
}

function getCourseImage(course) {
  return safeText(course?.imageUrl ?? course?.thumbnail ?? course?.image, "");
}

function getCourseId(course) {
  return course?.id || course?.courseId || "";
}

function getLessonIds(course) {
  if (!Array.isArray(course?.lessons)) return [];
  return course.lessons.map((lesson, index) => String(lesson?.id || `lesson_${index + 1}`));
}

function formatHours(seconds) {
  const totalMinutes = Math.round((Number(seconds) || 0) / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), ...data }));
  } catch {
    // Cache is optional.
  }
}

const StatCard = memo(function StatCard({ icon: Icon, iconClass, iconBg, label, value, description }) {
  return (
    <div className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon size={23} className={iconClass} />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      </div>
      <p className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
});

const QuickAction = memo(function QuickAction({ to, icon: Icon, iconBg, iconClass, title, description }) {
  return (
    <Link to={to} className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon size={23} className={iconClass} />
        </div>
        <ChevronRight size={20} className="text-slate-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-blue-600" />
      </div>
      <h3 className="mt-6 font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </Link>
  );
});

function Dashboard() {
  const cached = useMemo(() => readCache(), []);
  const [user, setUser] = useState(undefined);
  const [courses, setCourses] = useState(cached?.courses || []);
  const [progressDocs, setProgressDocs] = useState(cached?.progressDocs || []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
    });
    return unsubscribe;
  }, []);

  const loadDashboard = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setError("");

    try {
      // Do not use orderBy here. This keeps the dashboard independent of
      // Firestore composite indexes and matches the fixed Home page fetch.
      const [courseSnapshot, progressSnapshot] = await Promise.all([
        getDocs(collection(db, "courses")),
        user?.uid
          ? getDocs(query(collection(db, "lessonProgress"), where("userId", "==", user.uid)))
          : Promise.resolve({ docs: [] }),
      ]);

      const nextCourses = courseSnapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((course) => course.published !== false)
        .sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt));

      const nextProgress = progressSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

      setCourses(nextCourses);
      setProgressDocs(nextProgress);
      writeCache({ courses: nextCourses, progressDocs: nextProgress });
    } catch (err) {
      console.error("Dashboard data loading error:", err);
      setError(
        err?.code === "permission-denied"
          ? "Firebase permissions are blocking dashboard data. Please check Firestore rules."
          : err?.message || "Unable to load dashboard data right now."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user === undefined) return;
    loadDashboard(false);
  }, [user, loadDashboard]);

  const userInfo = useMemo(() => {
    const displayName = user?.displayName || user?.email?.split("@")[0] || "Student";
    return {
      displayName,
      firstName: displayName.trim().split(/\s+/)[0] || "Student",
      email: user?.email || "No email available",
      photo: user?.photoURL || "",
      provider: user?.providerData?.[0]?.providerId === "google.com" ? "Google Account" : "Email Account",
    };
  }, [user]);

  const courseProgress = useMemo(() => {
    const byCourse = {};

    progressDocs.forEach((item) => {
      const courseId = String(item.courseId || "");
      if (!courseId) return;
      if (!byCourse[courseId]) byCourse[courseId] = { completed: 0, total: 0, watchedSeconds: 0, records: 0 };

      const bucket = byCourse[courseId];
      const completed = item.completed25 === true || Number(item.percent) >= 25;
      if (completed) bucket.completed += 1;
      bucket.total += 1;
      bucket.records += 1;
      bucket.watchedSeconds += Number(item.watchedSeconds) || 0;
    });

    return byCourse;
  }, [progressDocs]);

  const learningCourses = useMemo(() => {
    return courses
      .map((course) => {
        const id = getCourseId(course);
        const lessonIds = getLessonIds(course);
        const progress = courseProgress[String(id)] || { completed: 0, total: 0, watchedSeconds: 0, records: 0 };
        const totalLessons = lessonIds.length || progress.total;
        const completed = Math.min(progress.completed, totalLessons || progress.completed);
        const percent = totalLessons > 0 ? Math.min(100, Math.round((completed / totalLessons) * 100)) : 0;
        return { ...course, id, percent, completed, totalLessons, watchedSeconds: progress.watchedSeconds, hasProgress: progress.records > 0 };
      })
      .filter((course) => course.hasProgress)
      .sort((a, b) => b.percent - a.percent);
  }, [courses, courseProgress]);

  const stats = useMemo(() => {
    const enrolled = learningCourses.length;
    const totalCompleted = learningCourses.reduce((sum, course) => sum + course.completed, 0);
    const totalLessons = learningCourses.reduce((sum, course) => sum + course.totalLessons, 0);
    const overallProgress = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;
    const watchedSeconds = progressDocs.reduce((sum, item) => sum + (Number(item.watchedSeconds) || 0), 0);
    const completedCourses = learningCourses.filter((course) => course.percent >= 100).length;

    return { enrolled, overallProgress, watchedSeconds, completedCourses };
  }, [learningCourses, progressDocs]);

  const featuredLearning = learningCourses.slice(0, 3);

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <section className="mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600 sm:text-sm">Student Dashboard</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[42px]">
                Welcome back, <span className="text-blue-600">{userInfo.firstName}</span>! 👋
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                Continue your learning journey and keep building your skills with Online Academy.
              </p>
            </div>
            <div className="flex w-full gap-3 sm:w-fit">
              <button type="button" onClick={() => loadDashboard(true)} disabled={refreshing} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 sm:flex-none">
                <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} /> Refresh
              </button>
              <Link to="/courses" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 sm:flex-none">
                Browse Courses <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 sm:px-7 sm:py-5">
            <div className="flex items-center gap-2 text-white"><GraduationCap size={20} /><h2 className="text-sm font-bold sm:text-base">Your Student Account</h2></div>
          </div>
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="flex min-w-0 items-center gap-4">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-blue-50 ring-4 ring-blue-50 sm:h-16 sm:w-16">
                {userInfo.photo ? <img src={userInfo.photo} alt={userInfo.displayName} width="64" height="64" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><User size={28} className="text-blue-600" /></div>}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-slate-900 sm:text-lg">{userInfo.displayName}</h3>
                <p className="mt-1 max-w-[240px] truncate text-xs text-slate-500 sm:max-w-md sm:text-sm">{userInfo.email}</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">Active Student</span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-600">{userInfo.provider}</span>
                </div>
              </div>
            </div>
            <Link to="/profile" className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 sm:w-fit"><User size={18} /> My Profile</Link>
          </div>
        </section>

        {error && (
          <section className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div className="min-w-0"><p className="font-bold">Dashboard data could not be fully loaded</p><p className="mt-1 text-sm">{error}</p></div>
          </section>
        )}

        <section className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
          <StatCard icon={BookOpen} iconBg="bg-blue-50" iconClass="text-blue-600" label="Courses" value={loading ? "…" : stats.enrolled} description="Courses in progress" />
          <StatCard icon={BarChart3} iconBg="bg-purple-50" iconClass="text-purple-600" label="Progress" value={loading ? "…" : `${stats.overallProgress}%`} description="Overall learning progress" />
          <StatCard icon={Clock3} iconBg="bg-orange-50" iconClass="text-orange-500" label="Time" value={loading ? "…" : formatHours(stats.watchedSeconds)} description="Lesson watch time" />
          <StatCard icon={Award} iconBg="bg-emerald-50" iconClass="text-emerald-600" label="Achievements" value={loading ? "…" : stats.completedCourses} description="Completed courses" />
        </section>

        <section className="mb-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><h2 className="text-2xl font-bold text-slate-900">Your Learning Progress</h2><p className="mt-1 text-sm text-slate-600 sm:text-base">Real progress from your watched lessons is shown here.</p></div>
            <Link to="/courses" className="hidden items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 sm:inline-flex">View courses <ArrowRight size={16} /></Link>
          </div>

          {loading && !featuredLearning.length ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200"><RefreshCw size={28} className="mx-auto animate-spin text-blue-600" /><p className="mt-3 font-bold text-slate-800">Loading your progress…</p></div>
          ) : featuredLearning.length ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {featuredLearning.map((course) => {
                const image = getCourseImage(course);
                return (
                  <Link key={course.id} to={`/courses/${course.id}`} className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md">
                    {image ? <img src={image} alt={getCourseTitle(course)} loading="lazy" className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.02]" /> : <div className="flex h-40 items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700"><BookOpen size={48} className="text-white/80" /></div>}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3"><h3 className="line-clamp-2 font-bold text-slate-900">{getCourseTitle(course)}</h3><PlayCircle size={20} className="shrink-0 text-blue-600" /></div>
                      <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500"><span>{course.completed} / {course.totalLessons || "—"} lessons</span><span className="text-blue-600">{course.percent}%</span></div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${course.percent}%` }} /></div>
                      <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>{formatHours(course.watchedSeconds)} watched</span>{course.percent >= 100 ? <span className="inline-flex items-center gap-1 font-bold text-emerald-600"><CheckCircle2 size={15} /> Completed</span> : <span className="font-bold text-blue-600">Continue <ArrowRight size={14} className="inline" /></span>}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 sm:p-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50"><BookOpen size={28} className="text-blue-600" /></div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">No learning progress yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Open a course and start watching a lesson. Your progress will automatically appear on this dashboard.</p>
              <Link to="/courses" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">Explore Courses <ArrowRight size={17} /></Link>
            </div>
          )}
        </section>

        <section className="mb-10">
          <div className="mb-5"><h2 className="text-2xl font-bold text-slate-900">Quick Actions</h2><p className="mt-1 text-sm text-slate-600 sm:text-base">Quickly access the most important areas of your account.</p></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <QuickAction to="/courses" icon={BookOpen} iconBg="bg-blue-50" iconClass="text-blue-600" title="Browse Courses" description="Explore available courses and start your learning journey." />
            <QuickAction to="/profile" icon={User} iconBg="bg-purple-50" iconClass="text-purple-600" title="My Profile" description="View and manage your student account information." />
            <QuickAction to="/dashboard" icon={BarChart3} iconBg="bg-emerald-50" iconClass="text-emerald-600" title="Learning Progress" description="Track your course progress and learning activity." />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl bg-slate-950">
          <div className="flex flex-col gap-6 px-5 py-7 sm:px-8 sm:py-9 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-blue-400 sm:text-sm"><GraduationCap size={18} /> Keep Learning</div>
              <h2 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">Your learning journey starts here.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">Explore courses, develop new skills and track your progress with Online Academy.</p>
            </div>
            <Link to="/courses" className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 sm:w-fit">Start Learning <ArrowRight size={18} /></Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default memo(Dashboard);
