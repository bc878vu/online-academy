import { Link } from "react-router-dom";

import {
  ArrowRight,
  BookOpen,
  Users,
  Award,
  PlayCircle,
  CheckCircle,
  GraduationCap,
  Laptop,
  Clock3,
  BarChart3,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Target,
} from "lucide-react";

import { auth } from "../firebase";


// ======================================================
// HOME PAGE
// ======================================================

function Home() {

  // ====================================================
  // CURRENT AUTHENTICATED USER
  //
  // Auth state is handled by App.jsx.
  // This page does NOT create another auth listener.
  // ====================================================

  const user = auth.currentUser;

  const isLoggedIn = Boolean(user);


  // ====================================================
  // FEATURES
  // ====================================================

  const features = [
    {
      icon: BookOpen,
      title: "Quality Courses",
      description:
        "Learn through structured courses with lectures, notes, quizzes and practical learning resources.",
    },

    {
      icon: Laptop,
      title: "Learn Anywhere",
      description:
        "Access your learning materials from desktop, tablet or mobile whenever it is convenient for you.",
    },

    {
      icon: BarChart3,
      title: "Track Progress",
      description:
        "Monitor your course progress, completed lessons and learning achievements from your dashboard.",
    },
  ];


  // ====================================================
  // LEARNING AREAS
  // ====================================================

  const learningAreas = [
    {
      title: "Computer Science",
      description:
        "Programming, web development, databases and modern computing skills.",
      icon: Laptop,
    },

    {
      title: "Business & Management",
      description:
        "Develop practical knowledge in management, communication and business.",
      icon: BarChart3,
    },

    {
      title: "Academic Skills",
      description:
        "Improve your academic knowledge with organized learning resources.",
      icon: GraduationCap,
    },
  ];


  // ====================================================
  // HOW IT WORKS
  // ====================================================

  const steps = [
    {
      number: "01",
      icon: Users,
      title: "Create an Account",
      description:
        "Register with your email or continue securely with Google.",
    },

    {
      number: "02",
      icon: BookOpen,
      title: "Choose a Course",
      description:
        "Explore available courses and select the subjects you want to learn.",
    },

    {
      number: "03",
      icon: PlayCircle,
      title: "Start Learning",
      description:
        "Watch lessons, complete quizzes and continue improving your skills.",
    },
  ];


  // ====================================================
  // RETURN
  // ====================================================

  return (
    <main className="bg-white text-slate-900">


      {/* ==================================================
          HERO SECTION
      ================================================== */}

      <section className="relative overflow-hidden bg-slate-950 text-white">


        {/* Background decoration */}

        <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />


        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:py-24 lg:px-8 lg:py-28">

          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">


            {/* ==================================================
                HERO CONTENT
            ================================================== */}

            <div className="max-w-2xl">


              {/* Badge */}

              <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-400 ring-1 ring-blue-500/20">

                <Sparkles size={16} />

                Learn Without Limits

              </div>


              {/* Heading */}

              <h1 className="mt-7 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">

                Learn new skills.

                <span className="block text-blue-500">
                  Build your future.
                </span>

              </h1>


              {/* Description */}

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">

                Learn from structured courses, improve your knowledge,
                develop practical skills and achieve your academic and
                professional goals with Online Academy.

              </p>


              {/* ==================================================
                  HERO BUTTONS
              ================================================== */}

              <div className="mt-9 flex flex-wrap gap-4">


                {/* Explore Courses */}

                <Link
                  to="/courses"
                  className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                >

                  Explore Courses

                  <ArrowRight
                    size={18}
                    className="transition-transform group-hover:translate-x-1"
                  />

                </Link>


                {/* Logged Out */}

                {!isLoggedIn && (

                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-6 py-3.5 font-semibold text-white transition hover:border-slate-600 hover:bg-white/5"
                  >

                    Create Account

                  </Link>

                )}


                {/* Logged In */}

                {isLoggedIn && (

                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-400/40 bg-blue-500/10 px-6 py-3.5 font-semibold text-blue-300 transition hover:bg-blue-500/20"
                  >

                    Go to Dashboard

                    <ArrowRight size={18} />

                  </Link>

                )}

              </div>


              {/* Trust Points */}

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400">


                <div className="flex items-center gap-2">

                  <CheckCircle
                    size={17}
                    className="text-blue-400"
                  />

                  Structured Learning

                </div>


                <div className="flex items-center gap-2">

                  <CheckCircle
                    size={17}
                    className="text-blue-400"
                  />

                  Learn at Your Pace

                </div>


                <div className="flex items-center gap-2">

                  <CheckCircle
                    size={17}
                    className="text-blue-400"
                  />

                  Progress Tracking

                </div>

              </div>

            </div>


            {/* ==================================================
                HERO PREVIEW
            ================================================== */}

            <div className="relative mx-auto w-full max-w-lg">


              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-sm sm:p-6">


                {/* Main Preview Card */}

                <div className="rounded-2xl bg-white p-6 text-slate-900 shadow-xl">


                  {/* Header */}

                  <div className="flex items-center justify-between">


                    <div className="flex items-center gap-3">

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">

                        <GraduationCap
                          size={24}
                          className="text-blue-600"
                        />

                      </div>


                      <div>

                        <p className="font-bold">
                          Online Academy
                        </p>

                        <p className="text-sm text-slate-500">
                          Student Learning
                        </p>

                      </div>

                    </div>


                    <div className="rounded-lg bg-green-50 px-3 py-1 text-xs font-semibold text-green-600">
                      Active
                    </div>

                  </div>


                  {/* Progress */}

                  <div className="mt-7">

                    <div className="flex items-center justify-between">

                      <p className="text-sm font-semibold text-slate-700">
                        Learning Progress
                      </p>

                      <span className="text-sm font-bold text-blue-600">
                        75%
                      </span>

                    </div>


                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">

                      <div className="h-full w-3/4 rounded-full bg-blue-600" />

                    </div>

                  </div>


                  {/* Cards */}

                  <div className="mt-6 grid grid-cols-2 gap-3">


                    <div className="rounded-xl bg-slate-50 p-4">

                      <BookOpen
                        size={20}
                        className="text-blue-600"
                      />

                      <p className="mt-2 text-xl font-bold">
                        Courses
                      </p>

                      <p className="text-xs text-slate-500">
                        Keep learning
                      </p>

                    </div>


                    <div className="rounded-xl bg-slate-50 p-4">

                      <Award
                        size={20}
                        className="text-blue-600"
                      />

                      <p className="mt-2 text-xl font-bold">
                        Skills
                      </p>

                      <p className="text-xs text-slate-500">
                        Keep improving
                      </p>

                    </div>

                  </div>

                </div>


                {/* Bottom Cards */}

                <div className="mt-4 grid grid-cols-2 gap-4">


                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

                    <Clock3
                      size={25}
                      className="text-blue-400"
                    />

                    <p className="mt-3 font-bold text-white">
                      Flexible
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      Learn at your own pace
                    </p>

                  </div>


                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

                    <BarChart3
                      size={25}
                      className="text-blue-400"
                    />

                    <p className="mt-3 font-bold text-white">
                      Track Progress
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      See your learning journey
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ==================================================
          STATS
      ================================================== */}

      <section className="border-b border-slate-200 bg-white">

        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-slate-200 px-6 sm:grid-cols-4 lg:px-8">


          <div className="px-4 py-8 text-center sm:py-10">

            <p className="text-3xl font-extrabold text-slate-900">
              100+
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Learning Resources
            </p>

          </div>


          <div className="px-4 py-8 text-center sm:py-10">

            <p className="text-3xl font-extrabold text-slate-900">
              5K+
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Learners
            </p>

          </div>


          <div className="border-t border-slate-200 px-4 py-8 text-center sm:border-t-0 sm:py-10">

            <p className="text-3xl font-extrabold text-slate-900">
              24/7
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Learning Access
            </p>

          </div>


          <div className="border-t border-slate-200 px-4 py-8 text-center sm:border-t-0 sm:py-10">

            <p className="text-3xl font-extrabold text-slate-900">
              100%
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Learn at Your Pace
            </p>

          </div>

        </div>

      </section>


      {/* ==================================================
          FEATURES
      ================================================== */}

      <section className="bg-slate-50 px-6 py-20 sm:py-24">

        <div className="mx-auto max-w-7xl">


          <div className="mx-auto max-w-2xl text-center">

            <span className="text-sm font-bold tracking-wider text-blue-600">
              WHY ONLINE ACADEMY
            </span>


            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Everything you need to learn
            </h2>


            <p className="mt-4 text-lg leading-7 text-slate-600">

              A simple and organized learning experience designed
              to help students learn effectively.

            </p>

          </div>


          <div className="mt-12 grid gap-6 md:grid-cols-3">

            {features.map((feature) => {

              const Icon = feature.icon;

              return (

                <div
                  key={feature.title}
                  className="group rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg"
                >

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">

                    <Icon
                      size={25}
                      className="text-blue-600"
                    />

                  </div>


                  <h3 className="mt-6 text-xl font-bold text-slate-900">
                    {feature.title}
                  </h3>


                  <p className="mt-3 leading-7 text-slate-600">
                    {feature.description}
                  </p>


                  <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-blue-600">

                    Learn more

                    <ArrowRight size={16} />

                  </div>

                </div>

              );

            })}

          </div>

        </div>

      </section>


      {/* ==================================================
          LEARNING AREAS
      ================================================== */}

      <section className="px-6 py-20 sm:py-24">

        <div className="mx-auto max-w-7xl">


          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">


            <div className="max-w-2xl">

              <span className="text-sm font-bold tracking-wider text-blue-600">
                EXPLORE LEARNING
              </span>


              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Learn what matters to you
              </h2>


              <p className="mt-4 text-lg text-slate-600">

                Explore different learning areas and build knowledge
                that supports your academic and professional goals.

              </p>

            </div>


            <Link
              to="/courses"
              className="inline-flex w-fit items-center gap-2 font-semibold text-blue-600 hover:text-blue-700"
            >

              View all courses

              <ArrowRight size={18} />

            </Link>

          </div>


          <div className="mt-12 grid gap-6 md:grid-cols-3">

            {learningAreas.map((area) => {

              const Icon = area.icon;

              return (

                <div
                  key={area.title}
                  className="rounded-2xl border border-slate-200 bg-white p-7 transition hover:border-blue-200 hover:shadow-lg"
                >


                  <div className="flex items-center justify-between">


                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">

                      <Icon
                        size={25}
                        className="text-blue-600"
                      />

                    </div>


                    <ArrowRight
                      size={20}
                      className="text-slate-300"
                    />

                  </div>


                  <h3 className="mt-6 text-xl font-bold text-slate-900">
                    {area.title}
                  </h3>


                  <p className="mt-3 leading-7 text-slate-600">
                    {area.description}
                  </p>


                  <Link
                    to="/courses"
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >

                    Explore

                    <ArrowRight size={16} />

                  </Link>

                </div>

              );

            })}

          </div>

        </div>

      </section>


      {/* ==================================================
          HOW IT WORKS
      ================================================== */}

      <section className="bg-slate-950 px-6 py-20 text-white sm:py-24">

        <div className="mx-auto max-w-7xl">


          <div className="mx-auto max-w-2xl text-center">

            <span className="text-sm font-bold tracking-wider text-blue-400">
              HOW IT WORKS
            </span>


            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              Start learning in three simple steps
            </h2>


            <p className="mt-4 text-lg leading-7 text-slate-400">
              Getting started with Online Academy is simple.
            </p>

          </div>


          <div className="mt-14 grid gap-8 md:grid-cols-3">

            {steps.map((step) => {

              const Icon = step.icon;

              return (

                <div
                  key={step.number}
                  className="relative rounded-2xl border border-slate-800 bg-slate-900 p-7"
                >


                  <div className="flex items-center justify-between">


                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10">

                      <Icon
                        size={25}
                        className="text-blue-400"
                      />

                    </div>


                    <span className="text-4xl font-black text-slate-800">
                      {step.number}
                    </span>

                  </div>


                  <h3 className="mt-7 text-xl font-bold">
                    {step.title}
                  </h3>


                  <p className="mt-3 leading-7 text-slate-400">
                    {step.description}
                  </p>

                </div>

              );

            })}

          </div>

        </div>

      </section>


      {/* ==================================================
          EXTRA BENEFITS
      ================================================== */}

      <section className="bg-slate-50 px-6 py-20 sm:py-24">

        <div className="mx-auto max-w-7xl">


          <div className="mx-auto max-w-2xl text-center">

            <span className="text-sm font-bold tracking-wider text-blue-600">
              BUILT FOR STUDENTS
            </span>


            <h2 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              A better way to learn online
            </h2>


            <p className="mt-4 text-lg text-slate-600">

              Everything is organized to make your learning
              experience simple and productive.

            </p>

          </div>


          <div className="mt-12 grid gap-6 md:grid-cols-3">


            {/* Secure */}

            <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">

                <ShieldCheck
                  size={25}
                  className="text-blue-600"
                />

              </div>


              <h3 className="mt-5 text-xl font-bold text-slate-900">
                Secure Learning
              </h3>


              <p className="mt-3 leading-7 text-slate-600">

                Your account and learning experience are protected
                with secure authentication.

              </p>

            </div>


            {/* Mobile */}

            <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">

                <Smartphone
                  size={25}
                  className="text-blue-600"
                />

              </div>


              <h3 className="mt-5 text-xl font-bold text-slate-900">
                Learn Anywhere
              </h3>


              <p className="mt-3 leading-7 text-slate-600">

                Access your courses from your computer,
                tablet or mobile device.

              </p>

            </div>


            {/* Progress */}

            <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">

                <Target
                  size={25}
                  className="text-blue-600"
                />

              </div>


              <h3 className="mt-5 text-xl font-bold text-slate-900">
                Focus on Progress
              </h3>


              <p className="mt-3 leading-7 text-slate-600">

                Keep track of your learning journey and continue
                improving your skills.

              </p>

            </div>

          </div>

        </div>

      </section>


      {/* ==================================================
          FINAL CTA
      ================================================== */}

      <section className="px-6 py-20 sm:py-24">

        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-blue-600 px-7 py-12 text-center text-white shadow-xl sm:px-12 sm:py-16">


          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">

            <GraduationCap size={30} />

          </div>


          <h2 className="mt-6 text-3xl font-extrabold sm:text-4xl">

            {isLoggedIn
              ? "Continue your learning journey"
              : "Ready to start learning?"}

          </h2>


          <p className="mx-auto mt-4 max-w-2xl text-lg leading-7 text-blue-100">

            {isLoggedIn
              ? "Go to your dashboard and continue learning from where you left off."
              : "Create your free account today and begin your learning journey with Online Academy."}

          </p>


          <div className="mt-8 flex flex-wrap justify-center gap-4">


            {/* Logged Out */}

            {!isLoggedIn && (

              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-blue-600 transition hover:bg-blue-50"
              >

                Create Free Account

                <ArrowRight size={18} />

              </Link>

            )}


            {/* Logged In */}

            {isLoggedIn && (

              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-blue-600 transition hover:bg-blue-50"
              >

                Open Dashboard

                <ArrowRight size={18} />

              </Link>

            )}


            <Link
              to="/courses"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 font-bold text-white transition hover:bg-white/10"
            >

              Browse Courses

            </Link>

          </div>

        </div>

      </section>


    </main>
  );
}


export default Home;