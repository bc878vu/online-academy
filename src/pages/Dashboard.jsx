import { memo, useMemo } from "react";

import {
  Link,
} from "react-router-dom";

import {
  GraduationCap,
  User,
  BookOpen,
  ArrowRight,
  BarChart3,
  Clock3,
  Award,
  ChevronRight,
} from "lucide-react";

import { auth } from "../firebase";


// ======================================================
// STAT CARD
// ======================================================

const StatCard = memo(function StatCard({
  icon: Icon,
  iconClass,
  iconBg,
  label,
  value,
  description,
}) {
  return (
    <div className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6">

      <div className="flex items-start justify-between gap-4">

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >

          <Icon
            size={23}
            className={iconClass}
          />

        </div>

        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </span>

      </div>

      <p className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>

    </div>
  );
});


// ======================================================
// QUICK ACTION CARD
// ======================================================

const QuickAction = memo(function QuickAction({
  to,
  icon: Icon,
  iconBg,
  iconClass,
  title,
  description,
}) {
  return (
    <Link
      to={to}
      className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6"
    >

      <div className="flex items-center justify-between">

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}
        >

          <Icon
            size={23}
            className={iconClass}
          />

        </div>

        <ChevronRight
          size={20}
          className="text-slate-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-blue-600"
        />

      </div>

      <h3 className="mt-6 font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>

    </Link>
  );
});


// ======================================================
// DASHBOARD
// ======================================================

function Dashboard() {

  // ====================================================
  // CURRENT USER
  // ====================================================
  //
  // App.jsx already handles Firebase authentication.
  // Do NOT create another onAuthStateChanged listener here.
  //

  const user = auth.currentUser;


  // ====================================================
  // USER DATA
  // ====================================================

  const userInfo = useMemo(() => {

    const displayName =
      user?.displayName ||
      user?.email?.split("@")[0] ||
      "Student";

    const firstName =
      displayName
        .trim()
        .split(/\s+/)[0] ||
      "Student";

    const email =
      user?.email ||
      "No email available";

    const photo =
      user?.photoURL ||
      "";

    const provider =
      user?.providerData?.[0]
        ?.providerId === "google.com"
        ? "Google Account"
        : "Email Account";

    return {
      displayName,
      firstName,
      email,
      photo,
      provider,
    };

  }, [user]);


  // ====================================================
  // DASHBOARD
  // ====================================================

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-50">


      {/* ==================================================
          MAIN CONTAINER
      ================================================== */}

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">


        {/* ==================================================
            WELCOME
        ================================================== */}

        <section className="mb-8">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            <div>

              <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600 sm:text-sm">
                Student Dashboard
              </p>

              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[42px]">

                Welcome back,{" "}

                <span className="text-blue-600">
                  {userInfo.firstName}
                </span>

                ! 👋

              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                Continue your learning journey and keep building your skills with Online Academy.
              </p>

            </div>


            {/* BROWSE */}

            <Link
              to="/courses"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-md active:scale-[0.98] sm:w-fit"
            >

              Browse Courses

              <ArrowRight
                size={18}
              />

            </Link>

          </div>

        </section>


        {/* ==================================================
            STUDENT ACCOUNT
        ================================================== */}

        <section className="mb-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">

          {/* HEADER */}

          <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 sm:px-7 sm:py-5">

            <div className="flex items-center gap-2 text-white">

              <GraduationCap
                size={20}
              />

              <h2 className="text-sm font-bold sm:text-base">
                Your Student Account
              </h2>

            </div>

          </div>


          {/* CONTENT */}

          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">


            {/* USER */}

            <div className="flex min-w-0 items-center gap-4">

              {/* PROFILE IMAGE */}

              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-blue-50 ring-4 ring-blue-50 sm:h-16 sm:w-16">

                {userInfo.photo ? (

                  <img
                    src={userInfo.photo}
                    alt={userInfo.displayName}
                    width="64"
                    height="64"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />

                ) : (

                  <div className="flex h-full w-full items-center justify-center">

                    <User
                      size={28}
                      className="text-blue-600"
                    />

                  </div>

                )}

              </div>


              {/* DETAILS */}

              <div className="min-w-0">

                <h3 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                  {userInfo.displayName}
                </h3>

                <p className="mt-1 max-w-[240px] truncate text-xs text-slate-500 sm:max-w-md sm:text-sm">
                  {userInfo.email}
                </p>


                {/* BADGES */}

                <div className="mt-2.5 flex flex-wrap gap-2">

                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                    Active Student
                  </span>

                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-600">
                    {userInfo.provider}
                  </span>

                </div>

              </div>

            </div>


            {/* PROFILE */}

            <Link
              to="/profile"
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 sm:w-fit"
            >

              <User
                size={18}
              />

              My Profile

            </Link>

          </div>

        </section>


        {/* ==================================================
            STATISTICS
        ================================================== */}

        <section className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">


          <StatCard
            icon={BookOpen}
            iconBg="bg-blue-50"
            iconClass="text-blue-600"
            label="Courses"
            value="0"
            description="Enrolled Courses"
          />


          <StatCard
            icon={BarChart3}
            iconBg="bg-purple-50"
            iconClass="text-purple-600"
            label="Progress"
            value="0%"
            description="Overall Progress"
          />


          <StatCard
            icon={Clock3}
            iconBg="bg-orange-50"
            iconClass="text-orange-500"
            label="Time"
            value="0h"
            description="Learning Time"
          />


          <StatCard
            icon={Award}
            iconBg="bg-emerald-50"
            iconClass="text-emerald-600"
            label="Achievements"
            value="0"
            description="Certificates"
          />

        </section>


        {/* ==================================================
            QUICK ACTIONS
        ================================================== */}

        <section className="mb-10">

          <div className="mb-5">

            <h2 className="text-2xl font-bold text-slate-900">
              Quick Actions
            </h2>

            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              Quickly access the most important areas of your account.
            </p>

          </div>


          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">


            <QuickAction
              to="/courses"
              icon={BookOpen}
              iconBg="bg-blue-50"
              iconClass="text-blue-600"
              title="Browse Courses"
              description="Explore available courses and start your learning journey."
            />


            <QuickAction
              to="/profile"
              icon={User}
              iconBg="bg-purple-50"
              iconClass="text-purple-600"
              title="My Profile"
              description="View and manage your student account information."
            />


            <QuickAction
              to="/dashboard"
              icon={BarChart3}
              iconBg="bg-emerald-50"
              iconClass="text-emerald-600"
              title="Learning Progress"
              description="Track your course progress and learning activity."
            />

          </div>

        </section>


        {/* ==================================================
            KEEP LEARNING
        ================================================== */}

        <section className="overflow-hidden rounded-2xl bg-slate-950">

          <div className="flex flex-col gap-6 px-5 py-7 sm:px-8 sm:py-9 lg:flex-row lg:items-center lg:justify-between lg:px-10">


            <div>

              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-blue-400 sm:text-sm">

                <GraduationCap
                  size={18}
                />

                Keep Learning

              </div>


              <h2 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">
                Your learning journey starts here.
              </h2>


              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                Explore courses, develop new skills and track your progress with Online Academy.
              </p>

            </div>


            <Link
              to="/courses"
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-[0.98] sm:w-fit"
            >

              Start Learning

              <ArrowRight
                size={18}
              />

            </Link>

          </div>

        </section>

      </div>

    </main>
  );
}


export default memo(Dashboard);