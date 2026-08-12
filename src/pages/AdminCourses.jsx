import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";

import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  FileVideo,
  GraduationCap,
  Link as LinkIcon,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { db, storage } from "../firebase";

const COURSE_COLLECTION = "courses";
const WATCH_REQUIREMENT = 25;
const FIREBASE_TIMEOUT_MS = 15000;

const withTimeout = (promise, ms = FIREBASE_TIMEOUT_MS, label = "Firebase request") =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `${label} timed out. Check your Firebase/Firestore connection and security rules.`
            )
          ),
        ms
      )
    ),
  ]);

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "",
  level: "Beginner",
  duration: "",
  imageUrl: "",
  published: true,
  lessons: [],
};

const makeLesson = (order = 1) => ({
  id: `lesson_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`,
  title: "",
  videoType: "link",
  videoUrl: "",
  captionsUrl: "",
  duration: "",
  requiredWatchPercent: WATCH_REQUIREMENT,
  order,
});

const normalizeLesson = (lesson, index) => ({
  id:
    lesson?.id ||
    `lesson_${Date.now()}_${index}_${Math.random()
      .toString(36)
      .slice(2, 7)}`,
  title: lesson?.title || "",
  videoType:
    lesson?.videoType === "upload" ? "upload" : "link",
  videoUrl: lesson?.videoUrl || "",
  captionsUrl: lesson?.captionsUrl || "",
  duration: lesson?.duration || "",
  requiredWatchPercent: WATCH_REQUIREMENT,
  order: Number(lesson?.order) || index + 1,
});

const normalizeCourse = (snap) => {
  const data = snap.data() || {};

  return {
    id: snap.id,
    title: data.title || "",
    description: data.description || "",
    category: data.category || "",
    level: data.level || "Beginner",
    duration: data.duration || "",
    imageUrl: data.imageUrl || data.image || "",
    published: data.published !== false,
    lessons: Array.isArray(data.lessons)
      ? data.lessons.map(normalizeLesson)
      : [],
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
};

const timestampValue = (value) => {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") {
    return value.toMillis();
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return 0;
};

function AlertMessage({ type, message, onClose }) {
  if (!message) return null;

  const success = type === "success";

  return (
    <div
      className={`mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm font-medium ${
        success
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {success ? (
        <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
      ) : (
        <AlertCircle size={19} className="mt-0.5 shrink-0" />
      )}

      <p className="min-w-0 flex-1 break-words">{message}</p>

      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-lg p-1 hover:bg-black/5"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [publishingId, setPublishingId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [lessonFiles, setLessonFiles] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});

  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const clearMessages = useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

  const loadCourses = useCallback(async ({ showLoader = true } = {}) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);

    setError("");

    try {
      const snapshot = await getDocs(
        collection(db, COURSE_COLLECTION)
      );

      const data = snapshot.docs
        .map(normalizeCourse)
        .sort(
          (a, b) =>
            timestampValue(b.createdAt) -
            timestampValue(a.createdAt)
        );

      setCourses(data);
    } catch (err) {
      console.error("Load courses error:", err);
      setError(err?.message || "Unable to load courses.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const openAddForm = () => {
    clearMessages();
    setEditingId(null);
    setLessonFiles({});
    setUploadProgress({});
    setForm({
      ...EMPTY_FORM,
      lessons: [],
    });
    setShowForm(true);
  };

  const openEditForm = (course) => {
    clearMessages();
    setEditingId(course.id);
    setLessonFiles({});
    setUploadProgress({});

    setForm({
      title: course.title || "",
      description: course.description || "",
      category: course.category || "",
      level: course.level || "Beginner",
      duration: course.duration || "",
      imageUrl: course.imageUrl || "",
      published: course.published !== false,
      lessons: Array.isArray(course.lessons)
        ? course.lessons.map(normalizeLesson)
        : [],
    });

    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setLessonFiles({});
    setUploadProgress({});
    setForm({
      ...EMPTY_FORM,
      lessons: [],
    });
  };

  const handleChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, []);

  const updateLesson = (lessonId, patch) => {
    setForm((previous) => ({
      ...previous,
      lessons: previous.lessons.map((lesson) =>
        lesson.id === lessonId
          ? { ...lesson, ...patch }
          : lesson
      ),
    }));
  };

  const addLesson = () => {
    setForm((previous) => ({
      ...previous,
      lessons: [
        ...previous.lessons,
        makeLesson(previous.lessons.length + 1),
      ],
    }));
  };

  const removeLesson = (lessonId) => {
    setForm((previous) => ({
      ...previous,
      lessons: previous.lessons
        .filter((lesson) => lesson.id !== lessonId)
        .map((lesson, index) => ({
          ...lesson,
          order: index + 1,
        })),
    }));

    setLessonFiles((previous) => {
      const next = { ...previous };
      delete next[lessonId];
      return next;
    });

    setUploadProgress((previous) => {
      const next = { ...previous };
      delete next[lessonId];
      return next;
    });
  };

  const moveLesson = (index, direction) => {
    setForm((previous) => {
      const next = [...previous.lessons];
      const target = index + direction;

      if (target < 0 || target >= next.length) {
        return previous;
      }

      [next[index], next[target]] = [next[target], next[index]];

      return {
        ...previous,
        lessons: next.map((lesson, itemIndex) => ({
          ...lesson,
          order: itemIndex + 1,
        })),
      };
    });
  };

  const handleVideoFile = (lessonId, file) => {
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setError("Please select a valid video file.");
      return;
    }

    setError("");

    setLessonFiles((previous) => ({
      ...previous,
      [lessonId]: file,
    }));

    updateLesson(lessonId, {
      videoType: "upload",
    });
  };

  const uploadVideo = (file, lessonId) =>
    new Promise((resolve, reject) => {
      const safeName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(-160);

      const storageRef = ref(
        storage,
        `courseVideos/${lessonId}/${Date.now()}-${safeName}`
      );

      const uploadTask = uploadBytesResumable(
        storageRef,
        file,
        { contentType: file.type }
      );

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const percent = Math.round(
            (snapshot.bytesTransferred /
              snapshot.totalBytes) *
              100
          );

          setUploadProgress((previous) => ({
            ...previous,
            [lessonId]: percent,
          }));
        },
        reject,
        async () => {
          try {
            const url = await getDownloadURL(
              uploadTask.snapshot.ref
            );
            resolve(url);
          } catch (err) {
            reject(err);
          }
        }
      );
    });

  const validateForm = () => {
    if (!form.title.trim()) return "Course title is required.";
    if (!form.description.trim()) {
      return "Course description is required.";
    }
    if (!form.category.trim()) {
      return "Course category is required.";
    }
    if (!form.duration.trim()) {
      return "Course duration is required.";
    }

    for (let index = 0; index < form.lessons.length; index += 1) {
      const lesson = form.lessons[index];

      if (!lesson.title.trim()) {
        return `Lesson ${index + 1}: title is required.`;
      }

      if (lesson.videoType === "upload") {
        if (!lesson.videoUrl && !lessonFiles[lesson.id]) {
          return `Lesson ${index + 1}: select a video file.`;
        }
      }

      if (lesson.videoType === "link") {
        if (!lesson.videoUrl.trim()) {
          return `Lesson ${index + 1}: video URL is required.`;
        }

        try {
          new URL(lesson.videoUrl.trim());
        } catch {
          return `Lesson ${index + 1}: enter a valid video URL.`;
        }
      }

      if (lesson.captionsUrl.trim()) {
        try {
          new URL(lesson.captionsUrl.trim());
        } catch {
          return `Lesson ${index + 1}: captions URL is invalid.`;
        }
      }
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    clearMessages();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      const lessons = [];

      for (const lesson of form.lessons) {
        let videoUrl = lesson.videoUrl.trim();

        if (
          lesson.videoType === "upload" &&
          lessonFiles[lesson.id]
        ) {
          videoUrl = await withTimeout(
            uploadVideo(lessonFiles[lesson.id], lesson.id),
            FIREBASE_TIMEOUT_MS,
            `Video upload for "${lesson.title || lesson.id}"`
          );
        }

        lessons.push({
          id: lesson.id,
          title: lesson.title.trim(),
          videoType: lesson.videoType,
          videoUrl,
          captionsUrl: lesson.captionsUrl.trim(),
          duration: lesson.duration.trim(),
          requiredWatchPercent: WATCH_REQUIREMENT,
          order: lesson.order,
        });
      }

      const cleanData = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        level: form.level,
        duration: form.duration.trim(),
        imageUrl: form.imageUrl.trim(),
        published: form.published,
        attendance: {
          requiredWatchPercent: WATCH_REQUIREMENT,
          rule: "student_is_present_after_watching_25_percent_of_lesson",
        },
        lessons,
      };

      if (editingId) {
        await withTimeout(
          updateDoc(
            doc(db, COURSE_COLLECTION, editingId),
            {
              ...cleanData,
              updatedAt: serverTimestamp(),
            }
          ),
          FIREBASE_TIMEOUT_MS,
          "Course update"
        );

        setCourses((previous) =>
          previous.map((course) =>
            course.id === editingId
              ? { ...course, ...cleanData }
              : course
          )
        );

        setSuccess("Course updated successfully.");
      } else {
        const created = await withTimeout(
          addDoc(
            collection(db, COURSE_COLLECTION),
            {
              ...cleanData,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }
          ),
          FIREBASE_TIMEOUT_MS,
          "Course save"
        );

        setCourses((previous) => [
          {
            id: created.id,
            ...cleanData,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          ...previous,
        ]);

        setSuccess("Course added successfully.");
      }

      closeForm();
    } catch (err) {
      console.error("Save course error:", err);

      const code = err?.code || "";
      let message = err?.message || "Unable to save course.";

      if (code === "permission-denied") {
        message =
          "Firestore permission denied. Make sure you are logged in as the admin and your Firestore rules allow the admin account to write courses.";
      } else if (code === "unauthenticated") {
        message = "Your Firebase session has expired. Please log in again.";
      } else if (code === "unavailable") {
        message =
          "Firebase is temporarily unavailable. Check your internet connection and try again.";
      } else if (code === "failed-precondition") {
        message =
          "Firestore configuration is incomplete. Check your Firebase project/database setup.";
      }

      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (course) => {
    if (deletingId || saving) return;

    const confirmed = window.confirm(
      `Delete "${course.title || "this course"}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    clearMessages();
    setDeletingId(course.id);

    try {
      await deleteDoc(
        doc(db, COURSE_COLLECTION, course.id)
      );

      setCourses((previous) =>
        previous.filter((item) => item.id !== course.id)
      );

      setSuccess("Course deleted successfully.");
    } catch (err) {
      console.error("Delete course error:", err);
      setError(err?.message || "Unable to delete course.");
    } finally {
      setDeletingId(null);
    }
  };

  const togglePublished = async (course) => {
    if (publishingId || saving) return;

    clearMessages();
    setPublishingId(course.id);

    const newStatus = course.published !== true;

    try {
      await updateDoc(
        doc(db, COURSE_COLLECTION, course.id),
        {
          published: newStatus,
          updatedAt: serverTimestamp(),
        }
      );

      setCourses((previous) =>
        previous.map((item) =>
          item.id === course.id
            ? { ...item, published: newStatus }
            : item
        )
      );

      setSuccess(
        newStatus
          ? "Course published."
          : "Course unpublished."
      );
    } catch (err) {
      console.error("Publish update error:", err);
      setError(
        err?.message || "Unable to update course status."
      );
    } finally {
      setPublishingId(null);
    }
  };

  const filteredCourses = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return courses;

    return courses.filter((course) =>
      [
        course.title,
        course.description,
        course.category,
        course.level,
        course.duration,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [courses, searchTerm]);

  const stats = useMemo(() => {
    const total = courses.length;
    const published = courses.filter(
      (course) => course.published === true
    ).length;

    const lessons = courses.reduce(
      (sum, course) => sum + course.lessons.length,
      0
    );

    return {
      total,
      published,
      drafts: total - published,
      lessons,
    };
  }, [courses]);

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-72px)] bg-slate-50">
        <div className="flex min-h-[500px] items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
              <GraduationCap
                size={30}
                className="text-blue-600"
              />
            </div>

            <div className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              Loading courses...
            </h2>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-50">
      <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <GraduationCap size={24} />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Administration
                </p>

                <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                  Course Management
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Create courses, add lessons, upload videos and manage
              the 25% attendance requirement.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow-md hover:bg-blue-700 lg:w-auto"
          >
            <Plus size={19} />
            Add New Course
          </button>
        </div>

        <AlertMessage
          type="error"
          message={error}
          onClose={() => setError("")}
        />

        <AlertMessage
          type="success"
          message={success}
          onClose={() => setSuccess("")}
        />

        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_auto_auto_auto_auto]">
          <div className="relative">
            <Search
              size={19}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search courses..."
              autoComplete="off"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <Stat label="Courses" value={stats.total} />
          <Stat
            label="Published"
            value={stats.published}
            valueClass="text-green-600"
          />
          <Stat
            label="Drafts"
            value={stats.drafts}
            valueClass="text-slate-600"
          />
          <Stat
            label="Lessons"
            value={stats.lessons}
            valueClass="text-blue-600"
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => loadCourses({ showLoader: false })}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white px-5 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50">
              <BookOpen
                size={38}
                className="text-blue-500"
              />
            </div>

            <h2 className="mt-6 text-xl font-bold text-slate-900 sm:text-2xl">
              {searchTerm ? "No matching courses" : "No courses yet"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {searchTerm
                ? "Try another search."
                : "Create your first course to get started."}
            </p>

            {!searchTerm && (
              <button
                type="button"
                onClick={openAddForm}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={18} />
                Add First Course
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course) => (
              <article
                key={course.id}
                className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative h-44 overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-800">
                  {course.imageUrl ? (
                    <img
                      src={course.imageUrl}
                      alt={course.title || "Course"}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <BookOpen
                        size={52}
                        className="text-white/90"
                      />
                    </div>
                  )}

                  <div className="absolute right-3 top-3">
                    {course.published ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                        <Eye size={13} />
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/85 px-3 py-1.5 text-xs font-bold text-white">
                        <EyeOff size={13} />
                        Draft
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <div className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-600">
                    <GraduationCap size={15} />
                    <span className="truncate">
                      {course.category || "Online Course"}
                    </span>
                  </div>

                  <h2 className="mt-3 line-clamp-2 text-lg font-bold leading-7 text-slate-900">
                    {course.title || "Untitled Course"}
                  </h2>

                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                    {course.description || "No description."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-slate-500">
                    {course.duration && (
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={14} />
                        {course.duration}
                      </span>
                    )}

                    {course.level && (
                      <span className="inline-flex items-center gap-1">
                        <BarChart3 size={14} />
                        {course.level}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1">
                      <BookOpen size={14} />
                      {course.lessons.length} lessons
                    </span>
                  </div>

                  <div className="mt-auto grid grid-cols-3 gap-2 pt-5">
                    <button
                      type="button"
                      onClick={() => openEditForm(course)}
                      disabled={saving || deletingId === course.id}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-2.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 sm:text-sm"
                    >
                      <Pencil size={15} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => togglePublished(course)}
                      disabled={
                        publishingId === course.id ||
                        deletingId === course.id
                      }
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-2.5 text-xs font-bold text-slate-700 hover:bg-green-50 hover:text-green-600 disabled:opacity-50 sm:text-sm"
                    >
                      {publishingId === course.id ? (
                        <RefreshCw
                          size={15}
                          className="animate-spin"
                        />
                      ) : course.published ? (
                        <EyeOff size={15} />
                      ) : (
                        <Eye size={15} />
                      )}

                      <span className="hidden sm:inline">
                        {course.published ? "Hide" : "Publish"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(course)}
                      disabled={
                        deletingId === course.id ||
                        publishingId === course.id
                      }
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-100 px-2 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 sm:text-sm"
                    >
                      {deletingId === course.id ? (
                        <RefreshCw
                          size={15}
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2 size={15} />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <div
          className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <div className="flex min-h-full items-start justify-center py-4 sm:items-center sm:py-8">
            <div
              className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                    Course Management
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
                    {editingId ? "Edit Course" : "Add New Course"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                  aria-label="Close"
                >
                  <X size={21} />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-6 p-4 sm:p-6"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Course Title" full>
                    <input
                      type="text"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="e.g. Complete Web Development"
                      maxLength={120}
                      disabled={saving}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Description" full>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={4}
                      maxLength={1000}
                      disabled={saving}
                      placeholder="Write course description..."
                      className={`${inputClass} resize-none`}
                    />
                    <p className="mt-1 text-right text-[11px] text-slate-400">
                      {form.description.length}/1000
                    </p>
                  </Field>

                  <Field label="Category">
                    <input
                      type="text"
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      placeholder="e.g. Development"
                      maxLength={80}
                      disabled={saving}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Level">
                    <select
                      name="level"
                      value={form.level}
                      onChange={handleChange}
                      disabled={saving}
                      className={inputClass}
                    >
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                      <option>All Levels</option>
                    </select>
                  </Field>

                  <Field label="Duration">
                    <input
                      type="text"
                      name="duration"
                      value={form.duration}
                      onChange={handleChange}
                      placeholder="e.g. 8 Weeks"
                      maxLength={50}
                      disabled={saving}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Course Image URL">
                    <input
                      type="url"
                      name="imageUrl"
                      value={form.imageUrl}
                      onChange={handleChange}
                      placeholder="https://..."
                      disabled={saving}
                      className={inputClass}
                    />
                  </Field>
                </div>

                {form.imageUrl.trim() && (
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <img
                      src={form.imageUrl}
                      alt="Course preview"
                      loading="lazy"
                      className="h-40 w-full object-cover sm:h-48"
                    />
                  </div>
                )}

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-slate-900">
                        Attendance Requirement
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        A student becomes Present after watching at least
                        25% of a lesson.
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-blue-600 px-3 py-1 text-sm font-bold text-white">
                      25%
                    </span>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">
                        Course Lessons
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Add video lessons, duration and optional captions.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addLesson}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      <Plus size={17} />
                      Add Lesson
                    </button>
                  </div>

                  {form.lessons.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                      <FileVideo
                        size={34}
                        className="mx-auto text-slate-400"
                      />
                      <p className="mt-3 font-bold text-slate-700">
                        No lessons added
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Add your first video lesson above.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-5">
                      {form.lessons.map((lesson, index) => (
                        <div
                          key={lesson.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                                Lesson {index + 1}
                              </span>

                              <p className="mt-2 text-xs font-semibold text-slate-400">
                                Required watch: {WATCH_REQUIREMENT}%
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveLesson(index, -1)}
                                disabled={saving || index === 0}
                                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-30"
                              >
                                ↑
                              </button>

                              <button
                                type="button"
                                onClick={() => moveLesson(index, 1)}
                                disabled={
                                  saving ||
                                  index === form.lessons.length - 1
                                }
                                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-30"
                              >
                                ↓
                              </button>

                              <button
                                type="button"
                                onClick={() => removeLesson(lesson.id)}
                                disabled={saving}
                                className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
                                aria-label="Remove lesson"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <Field label="Lesson Title" full>
                              <input
                                type="text"
                                value={lesson.title}
                                onChange={(event) =>
                                  updateLesson(lesson.id, {
                                    title: event.target.value,
                                  })
                                }
                                placeholder="e.g. Introduction to HTML"
                                maxLength={150}
                                disabled={saving}
                                className={inputClass}
                              />
                            </Field>

                            <Field label="Duration">
                              <input
                                type="text"
                                value={lesson.duration}
                                onChange={(event) =>
                                  updateLesson(lesson.id, {
                                    duration: event.target.value,
                                  })
                                }
                                placeholder="e.g. 15:30"
                                disabled={saving}
                                className={inputClass}
                              />
                            </Field>
                          </div>

                          <div className="mt-4">
                            <label className="mb-2 block text-sm font-bold text-slate-700">
                              Video Source
                            </label>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateLesson(lesson.id, {
                                    videoType: "upload",
                                  })
                                }
                                disabled={saving}
                                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold ${
                                  lesson.videoType === "upload"
                                    ? "border-blue-500 bg-blue-50 text-blue-600"
                                    : "border-slate-200 bg-white text-slate-600"
                                }`}
                              >
                                <Upload size={16} />
                                Upload
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  updateLesson(lesson.id, {
                                    videoType: "link",
                                  })
                                }
                                disabled={saving}
                                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold ${
                                  lesson.videoType === "link"
                                    ? "border-blue-500 bg-blue-50 text-blue-600"
                                    : "border-slate-200 bg-white text-slate-600"
                                }`}
                              >
                                <LinkIcon size={16} />
                                Video Link
                              </button>
                            </div>
                          </div>

                          {lesson.videoType === "upload" ? (
                            <div className="mt-4 rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-4">
                              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-blue-200 bg-white p-6 text-center hover:bg-blue-50">
                                <Upload
                                  size={28}
                                  className="text-blue-600"
                                />

                                <span className="mt-2 text-sm font-bold text-slate-800">
                                  Choose video file
                                </span>

                                <span className="mt-1 text-xs text-slate-500">
                                  MP4/WebM and other browser-supported video
                                  formats
                                </span>

                                <input
                                  type="file"
                                  accept="video/*"
                                  className="hidden"
                                  disabled={saving}
                                  onChange={(event) => {
                                    handleVideoFile(
                                      lesson.id,
                                      event.target.files?.[0]
                                    );
                                    event.target.value = "";
                                  }}
                                />
                              </label>

                              {lessonFiles[lesson.id] && (
                                <div className="mt-3 flex items-center gap-3 rounded-xl bg-white p-3">
                                  <FileVideo
                                    size={20}
                                    className="shrink-0 text-blue-600"
                                  />

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-slate-800">
                                      {lessonFiles[lesson.id].name}
                                    </p>

                                    <p className="text-xs text-slate-500">
                                      {(
                                        lessonFiles[lesson.id].size /
                                        1024 /
                                        1024
                                      ).toFixed(1)}{" "}
                                      MB
                                    </p>
                                  </div>
                                </div>
                              )}

                              {typeof uploadProgress[lesson.id] ===
                                "number" && (
                                <div className="mt-3">
                                  <div className="mb-1 flex justify-between text-xs font-bold text-slate-600">
                                    <span>Uploading...</span>
                                    <span>
                                      {uploadProgress[lesson.id]}%
                                    </span>
                                  </div>

                                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                                    <div
                                      className="h-full rounded-full bg-blue-600 transition-all"
                                      style={{
                                        width: `${uploadProgress[lesson.id]}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}

                              {lesson.videoUrl && (
                                <p className="mt-3 break-all text-xs text-green-700">
                                  Existing uploaded video is connected.
                                  Selecting a new file will replace it.
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="mt-4">
                              <label className="mb-2 block text-sm font-bold text-slate-700">
                                Video URL
                              </label>

                              <input
                                type="url"
                                value={lesson.videoUrl}
                                onChange={(event) =>
                                  updateLesson(lesson.id, {
                                    videoUrl: event.target.value,
                                  })
                                }
                                placeholder="https://example.com/video.mp4"
                                disabled={saving}
                                className={inputClass}
                              />

                              <p className="mt-1 text-xs text-slate-400">
                                Use a direct browser-playable MP4/WebM URL.
                              </p>
                            </div>
                          )}

                          <div className="mt-4">
                            <label className="mb-2 block text-sm font-bold text-slate-700">
                              Captions / Subtitles URL
                            </label>

                            <input
                              type="url"
                              value={lesson.captionsUrl}
                              onChange={(event) =>
                                updateLesson(lesson.id, {
                                  captionsUrl: event.target.value,
                                })
                              }
                              placeholder="https://example.com/captions.vtt"
                              disabled={saving}
                              className={inputClass}
                            />

                            <p className="mt-1 text-xs text-slate-400">
                              WebVTT (.vtt) captions are recommended.
                            </p>
                          </div>

                          {lesson.videoUrl && (
                            <div className="mt-4 overflow-hidden rounded-2xl bg-black">
                              <video
                                src={lesson.videoUrl}
                                controls
                                preload="metadata"
                                className="aspect-video w-full"
                              >
                                {lesson.captionsUrl && (
                                  <track
                                    kind="captions"
                                    src={lesson.captionsUrl}
                                    srcLang="en"
                                    label="English"
                                    default
                                  />
                                )}
                              </video>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    name="published"
                    checked={form.published}
                    onChange={handleChange}
                    disabled={saving}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />

                  <div>
                    <p className="font-bold text-slate-900">
                      Publish Course
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Published courses can be shown to students.
                    </p>
                  </div>
                </label>

                {error && (
                  <AlertMessage
                    type="error"
                    message={error}
                    onClose={() => setError("")}
                  />
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
                  >
                    {saving ? (
                      <>
                        <RefreshCw
                          size={18}
                          className="animate-spin"
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        {editingId ? "Update Course" : "Save Course"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50";

function Field({ label, full = false, children }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass = "text-slate-900",
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className={`mt-1 text-xl font-extrabold ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

export default AdminCourses;