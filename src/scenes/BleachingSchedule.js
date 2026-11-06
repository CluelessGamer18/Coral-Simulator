export const BLEACHING_YEARS = [2, 4, 5, 7, 8, 9];

export function getCalendarYear(yearsElapsed) {
    return Math.floor(yearsElapsed) + 1;
}

export function isBleachingYear(yearsElapsed) {
    return BLEACHING_YEARS.includes(getCalendarYear(yearsElapsed));
}
