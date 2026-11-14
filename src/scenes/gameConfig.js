// Numbers that more than one part of the game has to agree on. Anything used by a single file lives at the top
// of that file instead (see the README's tuning table).

export const GAME_YEARS = 10;
export const YEAR_DURATION_MS = 60_000;
export const SUMMER_DURATION_MS = YEAR_DURATION_MS / 2; // each year is a summer, then a winter of the same length
export const WINTER_DURATION_MS = YEAR_DURATION_MS - SUMMER_DURATION_MS;

// The longest a single frame is allowed to count for. A lag spike, or coming back to the tab, would otherwise
// teleport the fish and age the reef by seconds in one step.
export const MAX_FRAME_MS = 50;

export const FISH_SPEED = 6.75; // px per frame at 60fps

// Hearts above the fish. Health is counted in half hearts, so 3 hearts = 6.
export const MAX_HEARTS = 3;
export const HEART_SPACING = 36;
export const HEART_OFFSET_Y = 30; // gap between the top of the fish and the hearts
