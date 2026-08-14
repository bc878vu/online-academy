import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

// Attendance/progress is now owned by CourseDetails' verified player.
// This wrapper intentionally does not read/write lessonProgress, preventing
// duplicate saves, duplicate progress bars and conflicting attendance logic.
export default function LectureProgressGuard({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(undefined);

  useEffect(() => onAuthStateChanged(auth, (currentUser) => setUser(currentUser || null)), []);

  if (user === undefined) return children;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
