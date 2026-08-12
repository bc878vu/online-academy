// ======================================================
// IMPORTS
// ======================================================

import { useState } from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";


// ======================================================
// FIREBASE AUTH
// ======================================================

import {
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";


// ======================================================
// FIREBASE CONFIG
// ======================================================

import {
  auth,
  googleProvider,
} from "../firebase";


// ======================================================
// ICONS
// ======================================================

import {
  GraduationCap,
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";


// ======================================================
// LOGIN COMPONENT
// ======================================================

function Login() {

  const navigate = useNavigate();


  // ====================================================
  // FORM STATES
  // ====================================================

  const [email, setEmail] = useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);


  // ====================================================
  // LOADING STATES
  // ====================================================

  const [loading, setLoading] =
    useState(false);

  const [googleLoading, setGoogleLoading] =
    useState(false);


  // ====================================================
  // MESSAGE STATES
  // ====================================================

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  // ====================================================
  // COMMON RESET
  // ====================================================

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };


  // ====================================================
  // EMAIL VALIDATION
  // ====================================================

  const isValidEmail = (value) => {

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(value);
  };


  // ====================================================
  // EMAIL / PASSWORD LOGIN
  // ====================================================

  const handleLogin = async (e) => {

    e.preventDefault();

    clearMessages();


    // --------------------------------------------------
    // CLEAN INPUT
    // --------------------------------------------------

    const cleanEmail =
      email.trim();


    // --------------------------------------------------
    // VALIDATE EMAIL
    // --------------------------------------------------

    if (!cleanEmail) {

      setError(
        "Please enter your email address."
      );

      return;
    }


    if (!isValidEmail(cleanEmail)) {

      setError(
        "Please enter a valid email address."
      );

      return;
    }


    // --------------------------------------------------
    // VALIDATE PASSWORD
    // --------------------------------------------------

    if (!password) {

      setError(
        "Please enter your password."
      );

      return;
    }


    // --------------------------------------------------
    // START LOADING
    // --------------------------------------------------

    setLoading(true);


    try {

      console.log(
        "🔵 Starting email login..."
      );


      // ------------------------------------------------
      // FIREBASE EMAIL LOGIN
      // ------------------------------------------------

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );


      // ------------------------------------------------
      // VERIFY USER
      // ------------------------------------------------

      if (!userCredential?.user) {

        throw new Error(
          "Firebase login completed but no user was returned."
        );
      }


      console.log(
        "✅ Email login successful:",
        userCredential.user.email
      );


      // ------------------------------------------------
      // SUCCESS MESSAGE
      // ------------------------------------------------

      setSuccess(
        "Login successful. Redirecting..."
      );


      // ------------------------------------------------
      // DASHBOARD
      // ------------------------------------------------

      navigate(
        "/dashboard",
        {
          replace: true,
        }
      );

    } catch (error) {

      console.error(
        "❌ Email login error:",
        error
      );


      console.error(
        "Firebase error code:",
        error?.code
      );


      // ------------------------------------------------
      // FIREBASE ERROR HANDLING
      // ------------------------------------------------

      switch (error?.code) {

        case "auth/invalid-email":

          setError(
            "Please enter a valid email address."
          );

          break;


        case "auth/invalid-credential":

          setError(
            "Invalid email or password."
          );

          break;


        case "auth/user-not-found":

          setError(
            "No account was found with this email address."
          );

          break;


        case "auth/wrong-password":

          setError(
            "Incorrect password. Please try again."
          );

          break;


        case "auth/user-disabled":

          setError(
            "This account has been disabled. Please contact support."
          );

          break;


        case "auth/too-many-requests":

          setError(
            "Too many unsuccessful attempts. Please try again later."
          );

          break;


        case "auth/network-request-failed":

          setError(
            "Network error. Please check your internet connection."
          );

          break;


        case "auth/operation-not-allowed":

          setError(
            "Email/password login is not enabled in Firebase Authentication."
          );

          break;


        default:

          setError(
            "Unable to login right now. Please check your email and password."
          );

          break;
      }

    } finally {

      setLoading(false);

    }
  };


  // ======================================================
  // GOOGLE LOGIN
  // ======================================================

  const handleGoogleLogin = async () => {

    // ----------------------------------------------------
    // PREVENT DOUBLE CLICK
    // ----------------------------------------------------

    if (
      loading ||
      googleLoading
    ) {

      return;
    }


    // ----------------------------------------------------
    // CLEAR OLD MESSAGES
    // ----------------------------------------------------

    clearMessages();


    // ----------------------------------------------------
    // START GOOGLE LOADING
    // ----------------------------------------------------

    setGoogleLoading(true);


    try {

      console.log(
        "🔵 Starting Google login..."
      );


      // --------------------------------------------------
      // IMPORTANT
      //
      // DO NOT WRITE:
      //
      // const provider =
      //   new GoogleAuthProvider();
      //
      // We are using the SAME provider instance
      // exported by firebase.js.
      // --------------------------------------------------

      const result =
        await signInWithPopup(
          auth,
          googleProvider
        );


      // --------------------------------------------------
      // VERIFY USER
      // --------------------------------------------------

      if (!result?.user) {

        throw new Error(
          "Google authentication completed but no user was returned."
        );
      }


      console.log(
        "✅ Google login successful:",
        result.user.email
      );


      // --------------------------------------------------
      // SUCCESS
      // --------------------------------------------------

      setSuccess(
        "Google login successful. Redirecting..."
      );


      // --------------------------------------------------
      // DASHBOARD
      // --------------------------------------------------

      navigate(
        "/dashboard",
        {
          replace: true,
        }
      );

    } catch (error) {

      console.error(
        "❌ Google login error:",
        error
      );


      console.error(
        "Google Firebase error code:",
        error?.code
      );


      console.error(
        "Google Firebase error message:",
        error?.message
      );


      // --------------------------------------------------
      // GOOGLE ERROR HANDLING
      // --------------------------------------------------

      switch (error?.code) {

        case "auth/popup-closed-by-user":

          setError(
            "Google sign-in was cancelled."
          );

          break;


        case "auth/popup-blocked":

          setError(
            "Google sign-in popup was blocked. Please allow popups for localhost and try again."
          );

          break;


        case "auth/cancelled-popup-request":

          setError(
            "Another Google sign-in request is already running."
          );

          break;


        case "auth/account-exists-with-different-credential":

          setError(
            "An account already exists with this email using another login method."
          );

          break;


        case "auth/unauthorized-domain":

          setError(
            "This website domain is not authorized in Firebase Authentication."
          );

          break;


        case "auth/operation-not-allowed":

          setError(
            "Google Sign-In is not enabled in Firebase Authentication."
          );

          break;


        case "auth/network-request-failed":

          setError(
            "Network error. Please check your internet connection."
          );

          break;


        case "auth/invalid-api-key":

          setError(
            "Firebase API key is invalid. Please check your Firebase configuration."
          );

          break;


        case "auth/argument-error":

          setError(
            "Firebase Google authentication configuration error. Please restart the development server and try again."
          );

          break;


        default:

          setError(
            "Google login failed. Please try again."
          );

          break;
      }

    } finally {

      setGoogleLoading(false);

    }
  };


  // ======================================================
  // GLOBAL LOADING
  // ======================================================

  const isLoading =
    loading ||
    googleLoading;


  // ======================================================
  // PAGE
  // ======================================================

  return (

    <main
      className="
        min-h-[calc(100vh-76px)]
        bg-slate-50
        px-5
        py-10
        sm:px-6
        sm:py-14
      "
    >

      <div
        className="
          mx-auto
          flex
          w-full
          max-w-md
          items-center
          justify-center
        "
      >

        {/* ==============================================
            LOGIN CARD
        ============================================== */}

        <section
          className="
            w-full
            rounded-3xl
            bg-white
            p-6
            shadow-sm
            ring-1
            ring-slate-200
            sm:p-8
          "
        >

          {/* ============================================
              HEADER
          ============================================ */}

          <div
            className="
              mb-8
              text-center
            "
          >

            {/* LOGO */}

            <div
              className="
                mx-auto
                flex
                h-16
                w-16
                items-center
                justify-center
                rounded-2xl
                bg-blue-50
              "
            >

              <GraduationCap
                size={32}
                className="text-blue-600"
              />

            </div>


            {/* TITLE */}

            <h1
              className="
                mt-5
                text-3xl
                font-bold
                tracking-tight
                text-slate-900
              "
            >
              Welcome Back
            </h1>


            {/* SUBTITLE */}

            <p
              className="
                mt-2
                text-sm
                leading-6
                text-slate-600
              "
            >
              Sign in to continue your
              learning journey.
            </p>

          </div>


          {/* ============================================
              ERROR MESSAGE
          ============================================ */}

          {error && (

            <div
              role="alert"
              className="
                mb-5
                rounded-xl
                border
                border-red-200
                bg-red-50
                px-4
                py-3
                text-sm
                font-medium
                leading-6
                text-red-700
              "
            >

              {error}

            </div>

          )}


          {/* ============================================
              SUCCESS MESSAGE
          ============================================ */}

          {success && (

            <div
              role="status"
              className="
                mb-5
                flex
                items-start
                gap-3
                rounded-xl
                border
                border-emerald-200
                bg-emerald-50
                px-4
                py-3
                text-sm
                font-medium
                leading-6
                text-emerald-700
              "
            >

              <CheckCircle
                size={18}
                className="
                  mt-0.5
                  shrink-0
                "
              />

              <span>
                {success}
              </span>

            </div>

          )}


          {/* ============================================
              GOOGLE LOGIN
          ============================================ */}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="
              flex
              w-full
              items-center
              justify-center
              gap-3
              rounded-xl
              border
              border-slate-300
              bg-white
              px-4
              py-3.5
              font-semibold
              text-slate-700
              transition
              hover:border-slate-400
              hover:bg-slate-50
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >

            {googleLoading ? (

              <>

                <Loader2
                  size={20}
                  className="animate-spin"
                />

                Connecting...

              </>

            ) : (

              <>

                <span
                  className="
                    flex
                    h-6
                    w-6
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-slate-200
                    text-sm
                    font-bold
                    text-blue-600
                  "
                >
                  G
                </span>

                Continue with Google

              </>

            )}

          </button>


          {/* ============================================
              DIVIDER
          ============================================ */}

          <div
            className="
              my-7
              flex
              items-center
              gap-4
            "
          >

            <div
              className="
                h-px
                flex-1
                bg-slate-200
              "
            />

            <span
              className="
                text-xs
                font-semibold
                uppercase
                tracking-wider
                text-slate-400
              "
            >
              Or continue with email
            </span>

            <div
              className="
                h-px
                flex-1
                bg-slate-200
              "
            />

          </div>


          {/* ============================================
              EMAIL LOGIN FORM
          ============================================ */}

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            {/* ==========================================
                EMAIL
            ========================================== */}

            <div>

              <label
                htmlFor="login-email"
                className="
                  mb-2
                  block
                  text-sm
                  font-semibold
                  text-slate-700
                "
              >
                Email Address
              </label>


              <div
                className="relative"
              >

                <Mail
                  size={18}
                  className="
                    pointer-events-none
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />


                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isLoading}
                  spellCheck="false"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-300
                    bg-white
                    py-3.5
                    pl-11
                    pr-4
                    text-slate-900
                    outline-none
                    transition
                    placeholder:text-slate-400
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-100
                    disabled:cursor-not-allowed
                    disabled:bg-slate-50
                  "
                />

              </div>

            </div>


            {/* ==========================================
                PASSWORD
            ========================================== */}

            <div>

              <div
                className="
                  mb-2
                  flex
                  items-center
                  justify-between
                "
              >

                <label
                  htmlFor="login-password"
                  className="
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >
                  Password
                </label>


                {/* FORGOT PASSWORD */}

                <Link
                  to="/forgot-password"
                  className="
                    text-sm
                    font-semibold
                    text-blue-600
                    transition
                    hover:text-blue-700
                  "
                >
                  Forgot Password?
                </Link>

              </div>


              <div
                className="relative"
              >

                <Lock
                  size={18}
                  className="
                    pointer-events-none
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />


                <input
                  id="login-password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-300
                    bg-white
                    py-3.5
                    pl-11
                    pr-12
                    text-slate-900
                    outline-none
                    transition
                    placeholder:text-slate-400
                    focus:border-blue-500
                    focus:ring-4
                    focus:ring-blue-100
                    disabled:cursor-not-allowed
                    disabled:bg-slate-50
                  "
                />


                {/* SHOW / HIDE PASSWORD */}

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (previous) =>
                        !previous
                    )
                  }
                  disabled={isLoading}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="
                    absolute
                    right-3
                    top-1/2
                    -translate-y-1/2
                    rounded-lg
                    p-2
                    text-slate-400
                    transition
                    hover:bg-slate-100
                    hover:text-slate-600
                    disabled:cursor-not-allowed
                  "
                >

                  {showPassword ? (

                    <EyeOff
                      size={18}
                    />

                  ) : (

                    <Eye
                      size={18}
                    />

                  )}

                </button>

              </div>

            </div>


            {/* ==========================================
                LOGIN BUTTON
            ========================================== */}

            <button
              type="submit"
              disabled={isLoading}
              className="
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-blue-600
                py-3.5
                font-semibold
                text-white
                shadow-sm
                transition
                hover:bg-blue-700
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >

              {loading ? (

                <>

                  <Loader2
                    size={20}
                    className="animate-spin"
                  />

                  Signing in...

                </>

              ) : (

                "Login"

              )}

            </button>

          </form>


          {/* ============================================
              IMPORTANT
              
              NO CREATE ACCOUNT
              NO REGISTER
              NO SIGN UP
          ============================================ */}


          {/* ============================================
              BACK TO HOME
          ============================================ */}

          <div
            className="
              mt-7
              border-t
              border-slate-100
              pt-6
              text-center
            "
          >

            <Link
              to="/"
              className="
                inline-flex
                items-center
                gap-2
                text-sm
                font-semibold
                text-slate-500
                transition
                hover:text-blue-600
              "
            >

              <ArrowLeft
                size={16}
              />

              Back to Home

            </Link>

          </div>

        </section>

      </div>

    </main>
  );
}


// ======================================================
// EXPORT
// ======================================================

export default Login;