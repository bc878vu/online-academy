export const WATCH_REQUIREMENT = 25;
export const FINAL_EXAM_PASS = 60;
export const parseCourseWeeks = (value) => {
  const match = String(value || '').match(/(\d+(?:\.\d+)?)\s*(?:week|weeks|wk|wks)/i);
  return match ? Number(match[1]) : 0;
};
export const requiresFinalExam = (course) => parseCourseWeeks(course?.duration) >= 6;
export const shortCourse = (course) => parseCourseWeeks(course?.duration) > 0 && parseCourseWeeks(course?.duration) <= 2;
