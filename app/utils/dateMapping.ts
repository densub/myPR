export const DAYS = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 0,
} as const;

// Convert JS getDay() (0=Sunday) to our format (1=Monday)
export const getAppDayNumber = (jsDay: number): number => {
  // If it's Sunday (0), return 6, otherwise subtract 1
  return jsDay === 0 ? 6 : jsDay - 1;
};

// Convert our day number back to JS day number
export const getJSDayNumber = (appDay: number): number => {
  // If it's Sunday (6), return 0, otherwise add 1
  return appDay === 6 ? 0 : appDay + 1;
}; 