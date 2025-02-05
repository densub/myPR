export const formatMuscleGroupsTitle = (muscleGroups: string[]): string => {
  if (muscleGroups.length === 0) return '';
  if (muscleGroups.length === 1) return `IT'S ${muscleGroups[0].toUpperCase()} DAY`;
  if (muscleGroups.length === 2) return `IT'S ${muscleGroups[0]} AND ${muscleGroups[1]} DAY`;
  
  const lastGroup = muscleGroups[muscleGroups.length - 1];
  const otherGroups = muscleGroups.slice(0, -1).join(', ');
  return `IT'S ${otherGroups}, AND ${lastGroup} DAY`;
}; 