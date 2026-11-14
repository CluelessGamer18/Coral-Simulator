// The summers that bring a bleaching heatwave, by calendar year (the game's first year is year 1), and how many
// degrees each one adds to the water. Every heatwave is as hot as the last or hotter, as the climate warms.
// At +4 °C and above the heat alone is as dangerous as it gets; rising pollution is what makes later years harder.
export const SUMMER_TEMPERATURE_RISE = { 2: 3, 4: 4, 5: 4, 7: 5, 8: 6, 9: 7 };

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
