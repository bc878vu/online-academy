import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Search,
  ShieldCheck,
  XCircle,
  Award,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { useSearchParams } from "react-router-dom";
import { db } from "../firebase";

const SITE_URL = "https://online-academy-plum.vercel.app";

export default function VerifyCertificate() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [certificateId, setCertificateId] = useState("");
  const [certificate, setCertificate] = useState(null);

  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const [copied, setCopied] = useState(false);

  /*
   * ---------------------------------------------------------
   * VERIFY CERTIFICATE
   * ---------------------------------------------------------
   */

  const verifyCertificate = async (event, forcedId = "") => {
    if (event) {
      event.preventDefault();
    }

    const id = (forcedId || certificateId)
      .trim()
      .toUpperCase();

    /*
     * Empty ID
     */

    if (!id) {
      setCertificate(null);
      setStatus("error");
      setMessage("Please enter a Certificate ID.");
      return;
    }

    try {
      setStatus("loading");
      setMessage("");
      setCertificate(null);
      setCopied(false);

      /*
       * Firebase document:
       *
       * certificates/{CERTIFICATE_ID}
       */

      const certificateRef = doc(
        db,
        "certificates",
        id
      );

      const certificateSnap = await getDoc(
        certificateRef
      );

      /*
       * Certificate does not exist
       */

      if (!certificateSnap.exists()) {
        setStatus("invalid");
        setMessage(
          "This Certificate ID is not registered in Online Academy."
        );
        return;
      }

      const data = certificateSnap.data();

      /*
       * Certificate exists but is not valid
       */

      if (data.status !== "Valid") {
        setStatus("invalid");
        setMessage(
          "This certificate is not currently valid."
        );
        return;
      }

      /*
       * Valid certificate
       */

      const certificateData = {
        id: certificateSnap.id,
        ...data,
      };

      setCertificate(certificateData);
      setStatus("valid");

      /*
       * Put Certificate ID into URL.
       *
       * Example:
       *
       * /verify-certificate?certificateId=OA-XXXX
       */

      if (
        searchParams.get("certificateId") !== id
      ) {
        setSearchParams(
          {
            certificateId: id,
          },
          {
            replace: true,
          }
        );
      }

      /*
       * -----------------------------------------------------
       * SEO
       * -----------------------------------------------------
       */

      const verificationUrl =
        `${SITE_URL}/verify-certificate?certificateId=${encodeURIComponent(
          id
        )}`;

      const studentName =
        data.studentName ||
        "Online Academy Student";

      const courseTitle =
        data.courseTitle ||
        "Online Academy Course";

      const issueDate =
        data.issueDate ||
        "";

      const description =
        `Verify Online Academy certificate ${id}. ` +
        `Student: ${studentName}. ` +
        `Course: ${courseTitle}. ` +
        `Certificate status: Valid.`;

      /*
       * Browser title
       */

      document.title =
        `${studentName} — Certificate ${id} | Online Academy`;

      /*
       * Meta description
       */

      let metaDescription =
        document.querySelector(
          'meta[name="description"]'
        );

      if (!metaDescription) {
        metaDescription =
          document.createElement("meta");

        metaDescription.setAttribute(
          "name",
          "description"
        );

        document.head.appendChild(
          metaDescription
        );
      }

      metaDescription.setAttribute(
        "content",
        description
      );

      /*
       * Robots
       *
       * This tells search engines that this
       * verification page may be indexed.
       */

      let robots =
        document.querySelector(
          'meta[name="robots"]'
        );

      if (!robots) {
        robots =
          document.createElement("meta");

        robots.setAttribute(
          "name",
          "robots"
        );

        document.head.appendChild(robots);
      }

      robots.setAttribute(
        "content",
        "index,follow,max-image-preview:large"
      );

      /*
       * Canonical URL
       */

      let canonical =
        document.querySelector(
          'link[data-certificate-canonical="true"]'
        );

      if (!canonical) {
        canonical =
          document.createElement("link");

        canonical.setAttribute(
          "rel",
          "canonical"
        );

        canonical.setAttribute(
          "data-certificate-canonical",
          "true"
        );

        document.head.appendChild(
          canonical
        );
      }

      canonical.setAttribute(
        "href",
        verificationUrl
      );

      /*
       * -----------------------------------------------------
       * Open Graph
       * -----------------------------------------------------
       */

      const setMetaProperty = (
        property,
        content
      ) => {
        let element =
          document.querySelector(
            `meta[property="${property}"]`
          );

        if (!element) {
          element =
            document.createElement("meta");

          element.setAttribute(
            "property",
            property
          );

          document.head.appendChild(
            element
          );
        }

        element.setAttribute(
          "content",
          content
        );
      };

      setMetaProperty(
        "og:title",
        `Certificate ${id} | Online Academy`
      );

      setMetaProperty(
        "og:description",
        description
      );

      setMetaProperty(
        "og:url",
        verificationUrl
      );

      setMetaProperty(
        "og:type",
        "website"
      );

      setMetaProperty(
        "og:site_name",
        "Online Academy"
      );

      /*
       * -----------------------------------------------------
       * Twitter Card
       * -----------------------------------------------------
       */

      const setMetaName = (
        name,
        content
      ) => {
        let element =
          document.querySelector(
            `meta[name="${name}"]`
          );

        if (!element) {
          element =
            document.createElement("meta");

          element.setAttribute(
            "name",
            name
          );

          document.head.appendChild(
            element
          );
        }

        element.setAttribute(
          "content",
          content
        );
      };

      setMetaName(
        "twitter:card",
        "summary"
      );

      setMetaName(
        "twitter:title",
        `Certificate ${id} | Online Academy`
      );

      setMetaName(
        "twitter:description",
        description
      );

      /*
       * -----------------------------------------------------
       * JSON-LD Structured Data
       * -----------------------------------------------------
       */

      let structuredData =
        document.getElementById(
          "certificate-verification-schema"
        );

      if (!structuredData) {
        structuredData =
          document.createElement("script");

        structuredData.setAttribute(
          "id",
          "certificate-verification-schema"
        );

        structuredData.setAttribute(
          "type",
          "application/ld+json"
        );

        document.head.appendChild(
          structuredData
        );
      }

      const schema = {
        "@context": "https://schema.org",
        "@type": "WebPage",

        name:
          `Certificate ${id} | Online Academy`,

        description,

        url: verificationUrl,

        isPartOf: {
          "@type": "WebSite",
          name: "Online Academy",
          url: SITE_URL,
        },

        mainEntity: {
          "@type":
            "EducationalOccupationalCredential",

          credentialCategory:
            "Certificate of Completion",

          name: courseTitle,

          identifier: id,

          recognizedBy: {
            "@type": "Organization",
            name: "Online Academy",
            url: SITE_URL,
          },

          credentialStatus:
            "Valid",

          ...(issueDate
            ? {
                dateCreated: issueDate,
              }
            : {}),
        },
      };

      structuredData.textContent =
        JSON.stringify(schema);

    } catch (error) {
      console.error(
        "Certificate verification error:",
        error
      );

      setStatus("error");

      setMessage(
        "Unable to verify the certificate right now. Please try again."
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * AUTOMATIC VERIFICATION FROM URL
   * ---------------------------------------------------------
   *
   * Example:
   *
   * /verify-certificate?certificateId=OA-XXXX
   *
   * When somebody opens this URL, certificate verification
   * automatically starts.
   */

  useEffect(() => {
    const urlId =
      searchParams
        .get("certificateId")
        ?.trim()
        .toUpperCase();

    if (!urlId) {
      return;
    }

    setCertificateId(urlId);

    verifyCertificate(
      undefined,
      urlId
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchParams.get("certificateId"),
  ]);

  /*
   * ---------------------------------------------------------
   * CLEANUP
   * ---------------------------------------------------------
   */

  useEffect(() => {
    return () => {
      document
        .getElementById(
          "certificate-verification-schema"
        )
        ?.remove();
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * VERIFICATION URL
   * ---------------------------------------------------------
   */

  const verificationUrl =
    certificate
      ? `${SITE_URL}/verify-certificate?certificateId=${encodeURIComponent(
          certificate.id
        )}`
      : "";

  /*
   * ---------------------------------------------------------
   * COPY LINK
   * ---------------------------------------------------------
   */

  const copyVerificationLink = async () => {
    if (!verificationUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        verificationUrl
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);

    } catch (error) {
      console.error(
        "Copy failed:",
        error
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">

      <div className="mx-auto max-w-3xl">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">

            <ShieldCheck size={32} />

          </div>

          <p className="mt-5 text-xs font-bold uppercase tracking-[0.25em] text-blue-600">

            Online Academy

          </p>

          <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">

            Verify Certificate

          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">

            Enter the Certificate ID printed on an
            Online Academy certificate to verify its
            authenticity and current validity.

          </p>

        </div>

        {/* ==================================================
            SEARCH BOX
        ================================================== */}

        <form
          onSubmit={verifyCertificate}
          className="mx-auto mt-8 max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 shadow-xl sm:p-7"
        >

          <label className="mb-2 block text-sm font-bold text-slate-800">

            Certificate ID

          </label>

          <div className="flex flex-col gap-3 sm:flex-row">

            <input
              type="text"
              value={certificateId}
              onChange={(e) =>
                setCertificateId(
                  e.target.value
                )
              }
              placeholder="Example: OA-COURSE-USERID"
              autoComplete="off"
              spellCheck="false"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold uppercase outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />

            <button
              type="submit"
              disabled={
                status === "loading"
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >

              <Search size={18} />

              {status === "loading"
                ? "Checking..."
                : "Verify"}

            </button>

          </div>

          {/* Error message */}

          {message && (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">

              {message}

            </div>
          )}

        </form>

        {/* ==================================================
            VALID CERTIFICATE
        ================================================== */}

        {status === "valid" &&
          certificate && (

            <div className="mt-8 overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-xl">

              {/* Green header */}

              <div className="bg-emerald-600 px-6 py-5 text-white">

                <div className="flex items-center gap-3">

                  <CheckCircle2
                    size={30}
                  />

                  <div>

                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">

                      Verification Result

                    </p>

                    <h2 className="text-2xl font-extrabold">

                      Certificate Valid

                    </h2>            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {message}
            </div>
          )}
        </form>

        {status === "valid" && certificate && (
          <div className="mt-8 overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-xl">

            <div className="bg-emerald-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={30} />

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                    Verification Result
                  </p>

                  <h2 className="text-2xl font-extrabold">
                    Certificate Valid
                  </h2>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">

              <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Award size={32} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Certificate ID
                  </p>
                  <p className="mt-1 break-all text-sm font-extrabold text-slate-900">
                    {certificate.id}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-extrabold text-emerald-600">
                    <CheckCircle2 size={17} />
                    Valid
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Student
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900">
                    {certificate.studentName || "Online Academy Student"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Course
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900">
                    {certificate.courseTitle || "Online Course"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Issue Date
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900">
                    {certificate.issueDate || "—"}
                  </p>
                </div>

              </div>

              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <ShieldCheck
                  size={22}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <p className="text-sm leading-6 text-emerald-800">
                  This certificate is registered with Online Academy and
                  its current status is <strong>Valid</strong>.
                </p>
              </div>

            </div>
          </div>
        )}

        {status === "invalid" && (
          <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
              <XCircle size={34} />
            </div>

            <h2 className="mt-5 text-2xl font-extrabold text-slate-900">
              Certificate Not Found
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              The entered Certificate ID could not be verified.
              Please check the ID and try again.
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
