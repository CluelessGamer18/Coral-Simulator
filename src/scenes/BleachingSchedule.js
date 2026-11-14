// The summers that bring a heatwave, by calendar year (the game's first year is year 1), and how many degrees
// each one adds to the water. They are scripted, not random, so the difficulty is designed: a gentle first one,
// two back to back, a year off, then three in a row that keep getting hotter (see Objectives.js for the chapters).
export const SUMMER_TEMPERATURE_RISE = { 2: 3, 4: 4, 5: 5, 7: 5, 8: 6, 9: 7 };

export const BLEACHING_YEARS = Object.keys(SUMMER_TEMPERATURE_RISE).map(Number);

export function getCalendarYear(yearsElapsed) {
    return Math.floor(yearsElapsed) + 1;
}

export function isBleachingYear(yearsElapsed) {
    return BLEACHING_YEARS.includes(getCalendarYear(yearsElapsed));
}

export function getSummerTemperatureRise(yearsElapsed) {
    return SUMMER_TEMPERATURE_RISE[getCalendarYear(yearsElapsed)] ?? 0;
}
