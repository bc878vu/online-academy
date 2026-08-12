import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  BookOpen,
  ArrowRight,
  GraduationCap,
  Clock3,
  BarChart3,
  AlertCircle,
  RefreshCw,
  Search,
} from "lucide-react";

import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "../firebase";


// ======================================================
// COURSE CARD
// ======================================================

const CourseCard = memo(function CourseCard({
  course,
}) {

  const title =
    course.title ||
    course.name ||
    "Untitled Course";

  const image =
    course.imageUrl ||
    course.image ||
    "";

  const category =
    course.category ||
    "Online Course";

  const description =
    course.description ||
    "Start learning with this structured online course.";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">

      {/* IMAGE */}

      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">

        {image ? (

          <img
            src={image}
            alt={title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />

        ) : (

          <div className="flex h-full w-full items-center justify-center">

            <BookOpen
              size={52}
              className="text-white/90"
            />

          </div>

        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

      </div>


      {/* CONTENT */}

      <div className="flex flex-1 flex-col p-5 sm:p-6">

        {/* CATEGORY */}

        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-600">

          <GraduationCap
            size={15}
          />

          {category}

        </div>


        {/* TITLE */}

        <h2 className="mt-3 line-clamp-2 text-xl font-bold leading-tight text-slate-900">

          {title}

        </h2>


        {/* DESCRIPTION */}

        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">

          {description}

        </p>


        {/* META */}

        {(course.duration ||
          course.level) && (

          <div className="mt-5 flex flex-wrap gap-4 border-t border-slate-100 pt-5 text-sm text-slate-500">

            {course.duration && (

              <span className="flex items-center gap-1.5">

                <Clock3
                  size={16}
                />

                {course.duration}

              </span>

            )}


            {course.level && (

              <span className="flex items-center gap-1.5">

                <BarChart3
                  size={16}
                />

                {course.level}

              </span>

            )}

          </div>

        )}


        {/* BUTTON */}

        <Link
          to={`/courses/${course.id}`}
          className="mt-auto flex w-full items-center justify-center gap-2 pt-6"
        >

          <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]">

            View Course

            <ArrowRight
              size={18}
            />

          </span>

        </Link>

      </div>

    </article>
  );
});


// ======================================================
// COURSES
// ======================================================

function Courses({
  user,
}) {

  const [
    courses,
    setCourses,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");


  // ====================================================
  // LOAD COURSES
  // ====================================================

  const loadCourses =
    useCallback(
      async () => {

        try {

          setLoading(true);
          setError("");


          const coursesRef =
            collection(
              db,
              "courses"
            );


          // ------------------------------------------------
          // Single optimized query
          // ------------------------------------------------

          const coursesQuery =
            query(
              coursesRef,
              orderBy(
                "createdAt",
                "desc"
              )
            );


          const snapshot =
            await getDocs(
              coursesQuery
            );


          // ------------------------------------------------
          // Convert + published filter
          // ------------------------------------------------

          const courseList =
            snapshot.docs
              .map((document) => ({
                id: document.id,
                ...document.data(),
              }))
              .filter(
                (course) =>
                  course.published !== false
              );


          // ------------------------------------------------
          // Remove duplicate IDs
          // ------------------------------------------------

          const uniqueCourses =
            Array.from(
              new Map(
                courseList.map(
                  (course) => [
                    course.id,
                    course,
                  ]
                )
              ).values()
            );


          setCourses(
            uniqueCourses
          );

        } catch (err) {

          console.error(
            "Courses loading error:",
            err
          );


          setCourses([]);


          if (
            err?.code ===
            "permission-denied"
          ) {

            setError(
              "Firebase permission denied. Please check your Firestore security rules."
            );

          } else if (
            err?.code ===
            "failed-precondition"
          ) {

            setError(
              "Firestore needs an index for this query. Please create the required index in Firebase."
            );

          } else if (
            err?.code ===
            "unavailable"
          ) {

            setError(
              "Firebase is temporarily unavailable. Please check your internet connection."
            );

          } else {

            setError(
              err?.message ||
              "Unable to load courses. Please try again."
            );

          }

        } finally {

          setLoading(false);

        }

      },
      []
    );


  // ====================================================
  // INITIAL LOAD
  // ====================================================

  useEffect(() => {

    let cancelled = false;


    const load = async () => {

      if (cancelled) {
        return;
      }

      await loadCourses();

    };


    load();


    return () => {

      cancelled = true;

    };

  }, [
    loadCourses,
  ]);


  // ====================================================
  // SEARCH
  // ====================================================

  const filteredCourses =
    useMemo(() => {

      const search =
        searchTerm
          .trim()
          .toLowerCase();


      if (!search) {
        return courses;
      }


      return courses.filter(
        (course) => {

          const title =
            String(
              course.title ||
              course.name ||
              ""
            ).toLowerCase();


          const description =
            String(
              course.description ||
              ""
            ).toLowerCase();


          const category =
            String(
              course.category ||
              ""
            ).toLowerCase();


          return (
            title.includes(search) ||
            description.includes(search) ||
            category.includes(search)
          );

        }
      );

    }, [
      courses,
      searchTerm,
    ]);


  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {

    return (
      <main className="min-h-[calc(100vh-72px)] bg-slate-50">

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">

          <div className="mb-8">

            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              Explore Courses
            </p>

            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Find the right course for you
            </h1>

            <p className="mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
              Choose a course and start building valuable skills.
            </p>

          </div>


          {/* SKELETON */}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

            {[1, 2, 3].map(
              (item) => (

                <div
                  key={item}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >

                  <div className="h-48 animate-pulse bg-slate-200" />

                  <div className="space-y-4 p-6">

                    <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />

                    <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200" />

                    <div className="h-4 w-full animate-pulse rounded bg-slate-200" />

                    <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />

                    <div className="h-11 w-full animate-pulse rounded-xl bg-slate-200" />

                  </div>

                </div>

              )
            )}

          </div>

        </section>

      </main>
    );
  }


  // ====================================================
  // ERROR
  // ====================================================

  if (error) {

    return (
      <main className="min-h-[calc(100vh-72px)] bg-slate-50">

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">

          <div className="rounded-3xl border border-red-200 bg-white px-6 py-16 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">

              <AlertCircle
                size={32}
                className="text-red-500"
              />

            </div>


            <h2 className="mt-6 text-xl font-bold text-slate-900">
              Unable to load courses
            </h2>


            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
              {error}
            </p>


            <button
              type="button"
              onClick={loadCourses}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
            >

              <RefreshCw
                size={18}
              />

              Try Again

            </button>

          </div>

        </section>

      </main>
    );
  }


  // ====================================================
  // PAGE
  // ====================================================

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-50">

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">


        {/* ==============================================
            HEADER
        ============================================== */}

        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              Explore Courses
            </p>

            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Find the right course for you
            </h1>

            <p className="mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
              Choose a course and start building valuable skills.
            </p>

          </div>


          {/* SEARCH */}

          <div className="w-full lg:w-80">

            <div className="relative">

              <Search
                size={19}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Search courses..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />

            </div>

          </div>

        </div>


        {/* ==============================================
            COUNT
        ============================================== */}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">

          <p className="text-sm font-medium text-slate-500">

            Showing{" "}

            <span className="font-bold text-slate-900">
              {filteredCourses.length}
            </span>{" "}

            {filteredCourses.length === 1
              ? "course"
              : "courses"}

          </p>


          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">

            {courses.length}{" "}

            {courses.length === 1
              ? "Course"
              : "Courses"}

            {" "}Available

          </div>

        </div>


        {/* ==============================================
            EMPTY
        ============================================== */}

        {courses.length === 0 ? (

          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-16 text-center shadow-sm sm:px-8 sm:py-20">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100">

              <BookOpen
                size={38}
                className="text-slate-400"
              />

            </div>


            <h2 className="mt-7 text-2xl font-bold text-slate-900">
              No courses available yet
            </h2>


            <p className="mx-auto mt-3 max-w-lg text-base leading-7 text-slate-500 sm:text-lg">
              There are currently no published courses.
              New courses will appear here when they are added.
            </p>


            <button
              type="button"
              onClick={loadCourses}
              className="mt-7 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
            >

              <RefreshCw
                size={17}
              />

              Refresh Courses

            </button>

          </div>

        ) : filteredCourses.length === 0 ? (

          /* ============================================
             NO SEARCH RESULTS
          ============================================ */

          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">

              <Search
                size={30}
                className="text-slate-400"
              />

            </div>


            <h2 className="mt-6 text-xl font-bold text-slate-900">
              No matching courses
            </h2>


            <p className="mt-2 text-slate-500">
              Try a different course name, category, or keyword.
            </p>


            <button
              type="button"
              onClick={() =>
                setSearchTerm("")
              }
              className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Clear Search
            </button>

          </div>

        ) : (

          /* ============================================
             COURSE GRID
          ============================================ */

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

            {filteredCourses.map(
              (course) => (

                <CourseCard
                  key={course.id}
                  course={course}
                />

              )
            )}

          </div>

        )}

      </section>


      {/* ================================================
          LOGGED-OUT CTA
      ================================================ */}

      {user === null &&
        courses.length > 0 && (

          <section className="border-t border-slate-200 bg-white">

            <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-16">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">

                <GraduationCap
                  size={29}
                  className="text-blue-600"
                />

              </div>


              <h2 className="mt-5 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Ready to start learning?
              </h2>


              <p className="mx-auto mt-3 max-w-2xl text-slate-600">
                Create your student account and start your personalized learning journey.
              </p>


              <Link
                to="/register"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 active:scale-95"
              >

                Create Student Account

                <ArrowRight
                  size={19}
                />

              </Link>

            </div>

          </section>

        )}

    </main>
  );
}


export default Courses;