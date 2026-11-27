// Numbers that more than one part of the game has to agree on, React included (this file doesn't import Phaser, so
// the title screen can use it without downloading the game). Anything used by a single file lives at the top of that
// file instead (see the README's tuning table).

// The canvas, and the world the camera scrolls across
export const GAME_WIDTH = 1440;
export const GAME_HEIGHT = 1024;
export const WORLD_WIDTH = 5720;
export const WORLD_HEIGHT = GAME_HEIGHT;

// Where the fish can swim: SIDE_MARGIN in from either end of the world (or the tutorial's single screen), from just
// under the surface down to the band of sand above the HUD.
export const PLAY_AREA = { sideMargin: 100, top: 120, bottom: 850 };
export const FLOOR_SHADOW_Y = 950; // where the fish's shadow falls on the sand

// The calendar
export const START_YEAR = 2026;
export const GAME_YEARS = 10;
export const END_YEAR = START_YEAR + GAME_YEARS;
export const YEAR_DURATION_MS = 60_000;
export const SUMMER_DURATION_MS = YEAR_DURATION_MS / 2; // each year is a summer, then a winter of the same length
export const WINTER_DURATION_MS = YEAR_DURATION_MS - SUMMER_DURATION_MS;
export const GAME_DURATION_MS = GAME_YEARS * YEAR_DURATION_MS;

// Movement is tuned for 60 frames a second and scaled by how long each frame really took. The longest a single frame
// may count for: a lag spike, or coming back to the tab, would otherwise teleport the fish and age the reef in one step.
export const FRAME_MS_AT_60FPS = 1000 / 60;
export const MAX_FRAME_MS = 50;

// The player's fish
export const FISH_SPEED = 6.75; // px per frame at 60fps
export const SPRINT_MULTIPLIER = 1.75; // holding Space swims this many times faster
export const FISH_SCALE = 1.3 / 1.5; // before it grows from eating
export const HIDE_DISTANCE = 150; // how close the fish has to be to a coral or the nest to hide in it

// Hearts above the fish. Health is counted in half hearts, so 3 hearts = 6.
export const MAX_HEARTS = 3;
export const MAX_HEALTH = MAX_HEARTS * 2;
export const HEART_SPACING = 36;
export const HEART_OFFSET_Y = 30; // gap between the top of the fish and the hearts

// Food: shellfish on the sea floor that heal the fish and make it grow
export const FOOD_GROWTH = 1.1; // each shellfish eaten makes the fish 10% bigger
export const FOOD_SIZE = 44; // on-screen size of an average shellfish, as the square root of its area
export const FOOD_MIN_Y = 790;
export const FOOD_MAX_Y = 845;

// The grouper that hunts the fish
export const PREDATOR_SPEED = 3.375;
export const PREDATOR_SCALE = 0.4;
export const PREDATOR_ESCAPE_MARGIN = 50; // how far past the edge it swims before it has gone

// The water. Normal values are where a game starts and where every winter returns to.
export const NORMAL_TEMPERATURE = 27;
export const MAX_TEMPERATURE = 35;
export const NORMAL_LIGHT = 500;
export const SUMMER_PEAK_LIGHT = 1500; // the light at the height of a summer, before any Cloudy bubbles
// [a, b) and (c, d] are the stressed ranges; at or beyond a or d the reef dies; between b and c is healthy
export const THRESHOLDS = {
    temperature: { a: 25, b: 27, c: 29, d: 31 },
    light: { a: 141, b: 200, c: 1100, d: 1839 },
};
export const STARTING_POLLUTION = 1;
export const MAX_POLLUTION = 5;
export const CRITICAL_STRESS = 80; // the reef is close to dying: the stress alarm sounds and the HUD's dial flashes

// Draw order. Phaser draws higher depths in front; corals use the three depths up to and including coralFrontRow.
export const DEPTH = {
    surface: -4,
    fishSchools: 0, // plus 0, 1 or 2 for the school's layer
    seaFloorFar: 1,
    seaFloorMiddle: 2,
    seaFloorNear: 5,
    seaFloorFront: 6,
    sewagePipe: 6,
    fishShadow: 6,
    nest: 6.5,
    coralFrontRow: 7,
    bubble: 7,
    nestPiece: 7.5,
    food: 7.5,
    bubbleLabel: 8,
    tutorialShellfish: 8,
    newCoralText: 20,
    heatGlow: 9000,
    predator: 9998,
    player: 9999,
    heartOutline: 9999.4,
    heart: 9999.5,
    stamina: 9999.6,
    lightOverlay: 10000,
    stressOutline: 10001,
    prompt: 10002,
};

// One font for text drawn on the canvas, the same as the page's (loaded by main.jsx)
export const FONT_FAMILY = "Poppins, sans-serif";

export const COLORS = {
    brandTeal: "#0292a5",
    brandOrange: "#f86a1c",
    seaBackground: "#8acfc9",
    cloudyBubble: 0x44dd66,
    cloudyLabel: "#123d24",
    coralHover: 0xffcc88,
    hurt: 0xff6666,
    foodGlow: 0xff4d4d,
};
