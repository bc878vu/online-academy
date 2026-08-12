import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";

import {
  User,
  Mail,
  ShieldCheck,
  CheckCircle,
  BookOpen,
  Award,
  ArrowLeft,
  ArrowRight,
  Pencil,
  Save,
  X,
  Loader2,
} from "lucide-react";

import { auth } from "../firebase";


// ======================================================
// PROFILE PAGE
// ======================================================

function Profile() {
  const navigate = useNavigate();

  // ====================================================
  // STATE
  // ====================================================

  const [user, setUser] = useState(null);

  const [name, setName] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(false);

  const [success, setSuccess] = useState("");

  const [error, setError] = useState("");


  // ====================================================
  // GET CURRENT FIREBASE USER
  // ====================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {

        // ----------------------------------------------
        // User is not logged in
        // ----------------------------------------------

        if (!currentUser) {
          setUser(null);
          setLoading(false);

          navigate("/login", {
            replace: true,
          });

          return;
        }


        // ----------------------------------------------
        // User is logged in
        // ----------------------------------------------

        setUser(currentUser);

        setName(
          currentUser.displayName ||
            currentUser.email?.split("@")[0] ||
            "Student"
        );

        setLoading(false);
      }
    );


    return () => {
      unsubscribe();
    };
  }, [navigate]);


  // ====================================================
  // SAVE PROFILE
  // ====================================================

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");


    const trimmedName = name.trim();


    // ----------------------------------------------
    // Validate name
    // ----------------------------------------------

    if (!trimmedName) {
      setError("Please enter your full name.");
      return;
    }


    if (trimmedName.length < 2) {
      setError(
        "Name must contain at least 2 characters."
      );
      return;
    }


    // ----------------------------------------------
    // Save
    // ----------------------------------------------

    try {
      setSaving(true);


      await updateProfile(user, {
        displayName: trimmedName,
      });


      // Update local user state
      setUser({
        ...user,
        displayName: trimmedName,
      });


      setName(trimmedName);

      setEditing(false);

      setSuccess(
        "Your profile has been updated successfully."
      );


    } catch (err) {
      console.error(
        "Profile update error:",
        err
      );

      setError(
        "Unable to update your profile. Please try again."
      );

    } finally {
      setSaving(false);
    }
  };


  // ====================================================
  // CANCEL EDIT
  // ====================================================

  const handleCancelEdit = () => {

    setName(
      user?.displayName ||
        user?.email?.split("@")[0] ||
        "Student"
    );

    setEditing(false);

    setError("");

    setSuccess("");
  };


  // ====================================================
  // LOADING SCREEN
  // ====================================================

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-slate-50 px-5">

        <div className="text-center">

          <Loader2
            size={34}
            className="mx-auto animate-spin text-blue-600"
          />

          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading profile...
          </p>

        </div>

      </main>
    );
  }


  // ====================================================
  // SAFETY CHECK
  // ====================================================

  if (!user) {
    return null;
  }


  // ====================================================
  // USER DATA
  // ====================================================

  const displayName =
    user.displayName ||
    user.email?.split("@")[0] ||
    "Student";


  const email =
    user.email ||
    "No email available";


  const photo =
    user.photoURL ||
    null;


  const provider =
    user.providerData?.[0]?.providerId ===
    "google.com"
      ? "Google Account"
      : "Email Account";


  // ====================================================
  // PAGE
  // ====================================================

  return (
    <main className="min-h-[calc(100vh-76px)] bg-slate-50">

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6 lg:py-10">

        {/* ==================================================
            BACK TO DASHBOARD
        ================================================== */}

        <Link
          to="/dashboard"
          className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
        >
          <ArrowLeft size={17} />

          Back to Dashboard
        </Link>


        {/* ==================================================
            PAGE HEADING
        ================================================== */}

        <div className="mb-8">

          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
            Account Settings
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            My Profile
          </h1>

          <p className="mt-3 max-w-2xl text-slate-600">
            View and manage your Online Academy
            student account.
          </p>

        </div>


        {/* ==================================================
            SUCCESS MESSAGE
        ================================================== */}

        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">

            <CheckCircle size={18} />

            <span>
              {success}
            </span>

          </div>
        )}


        {/* ==================================================
            ERROR MESSAGE
        ================================================== */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">

            {error}

          </div>
        )}


        {/* ==================================================
            PROFILE CARD
        ================================================== */}

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">

          {/* ==================================================
              PROFILE HEADER
          ================================================== */}

          <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-8 sm:px-8">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">

              {/* PROFILE IMAGE */}

              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-white p-1.5 shadow-lg">

                {photo ? (
                  <img
                    src={photo}
                    alt={displayName}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-blue-50">

                    <User
                      size={38}
                      className="text-blue-600"
                    />

                  </div>
                )}

              </div>


              {/* USER DETAILS */}

              <div className="text-white">

                <h2 className="text-2xl font-bold">
                  {displayName}
                </h2>

                <p className="mt-1 text-blue-100">
                  {email}
                </p>


                <div className="mt-3 flex flex-wrap gap-2">

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">

                    <CheckCircle size={13} />

                    Active Student

                  </span>


                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
                    {provider}
                  </span>

                </div>

              </div>

            </div>

          </div>


          {/* ==================================================
              PERSONAL INFORMATION
          ================================================== */}

          <div className="p-6 sm:p-8">

            {/* SECTION HEADER */}

            <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h3 className="text-xl font-bold text-slate-900">
                  Personal Information
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Manage your basic account information.
                </p>

              </div>


              {/* EDIT BUTTON */}

              {!editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(true);
                    setSuccess("");
                    setError("");
                  }}
                  className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                >

                  <Pencil size={16} />

                  Edit Profile

                </button>
              )}

            </div>


            {/* ==================================================
                FORM
            ================================================== */}

            <form
              onSubmit={handleSaveProfile}
              className="space-y-6"
            >

              {/* ==================================================
                  FULL NAME
              ================================================== */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Full Name
                </label>


                <div className="relative">

                  <User
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />


                  <input
                    type="text"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    disabled={!editing || saving}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-80"
                  />

                </div>

              </div>


              {/* ==================================================
                  EMAIL
              ================================================== */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email Address
                </label>


                <div className="relative">

                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />


                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 py-3 pl-11 pr-4 text-slate-600"
                  />

                </div>


                <p className="mt-2 text-xs text-slate-500">
                  Your email address is managed by
                  Firebase Authentication.
                </p>

              </div>


              {/* ==================================================
                  ACCOUNT INFORMATION
              ================================================== */}

              <div className="grid gap-5 sm:grid-cols-2">

                {/* ACCOUNT TYPE */}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

                  <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">

                      <ShieldCheck
                        size={22}
                        className="text-blue-600"
                      />

                    </div>


                    <div>

                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Account Type
                      </p>

                      <p className="mt-1 font-bold text-slate-900">
                        {provider}
                      </p>

                    </div>

                  </div>

                </div>


                {/* ACCOUNT STATUS */}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

                  <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">

                      <CheckCircle
                        size={22}
                        className="text-emerald-600"
                      />

                    </div>


                    <div>

                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Account Status
                      </p>

                      <p className="mt-1 font-bold text-emerald-600">
                        Active
                      </p>

                    </div>

                  </div>

                </div>

              </div>


              {/* ==================================================
                  EDIT BUTTONS
              ================================================== */}

              {editing && (
                <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">

                  {/* CANCEL */}

                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    <X size={18} />

                    Cancel

                  </button>


                  {/* SAVE */}

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    {saving ? (
                      <>
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />

                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={18} />

                        Save Changes
                      </>
                    )}

                  </button>

                </div>
              )}

            </form>

          </div>

        </section>


        {/* ==================================================
            QUICK ACTIONS
        ================================================== */}

        <section className="mt-6 grid gap-5 md:grid-cols-2">

          {/* ==================================================
              COURSES
          ================================================== */}

          <Link
            to="/courses"
            className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-md"
          >

            <div className="flex items-center justify-between">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">

                <BookOpen
                  size={23}
                  className="text-blue-600"
                />

              </div>


              <ArrowRight
                size={20}
                className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600"
              />

            </div>


            <h3 className="mt-6 font-bold text-slate-900">
              Browse Courses
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Explore available courses and start
              your learning journey.
            </p>

          </Link>


          {/* ==================================================
              DASHBOARD
          ================================================== */}

          <Link
            to="/dashboard"
            className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-md"
          >

            <div className="flex items-center justify-between">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">

                <Award
                  size={23}
                  className="text-emerald-600"
                />

              </div>


              <ArrowRight
                size={20}
                className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600"
              />

            </div>


            <h3 className="mt-6 font-bold text-slate-900">
              Learning Dashboard
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Return to your dashboard and view your
              learning progress.
            </p>

          </Link>

        </section>


        {/* ==================================================
            SECURITY / ACCOUNT NOTE
        ================================================== */}

        <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">

          <div className="flex gap-3">

            <ShieldCheck
              size={22}
              className="mt-0.5 shrink-0 text-blue-600"
            />

            <div>

              <h3 className="font-bold text-slate-900">
                Your Account
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Your account authentication is securely
                managed through Firebase Authentication.
                Your email address cannot be changed
                from this profile page.
              </p>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}


export default Profile;