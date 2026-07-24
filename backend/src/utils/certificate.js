export function certificateAchievement(marksObtained, maxMarks) {
  if (
    !Number.isFinite(marksObtained) ||
    !Number.isFinite(maxMarks) ||
    maxMarks <= 0
  ) {
    return { percentage: null, grade: "Not graded", badge: "Completion" };
  }
  const percentage = Math.round((marksObtained / maxMarks) * 1000) / 10;
  const grade =
    percentage >= 90
      ? "A+"
      : percentage >= 80
        ? "A"
        : percentage >= 70
          ? "B"
          : percentage >= 60
            ? "C"
            : "Pass";
  const badge =
    percentage >= 90
      ? "Distinction"
      : percentage >= 75
        ? "Merit"
        : percentage >= 60
          ? "Achievement"
          : "Completion";
  return { percentage, grade, badge };
}

export function certificateMarksError(marksObtained, maxMarks) {
  if (!Number.isFinite(maxMarks) || maxMarks <= 0)
    return "Maximum marks must be greater than zero";
  if (!Number.isFinite(marksObtained) || marksObtained < 0)
    return "Marks obtained must be zero or more";
  if (marksObtained > maxMarks)
    return "Marks obtained cannot exceed maximum marks";
  return null;
}
