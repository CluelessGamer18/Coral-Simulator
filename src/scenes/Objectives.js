import { GAME_YEARS } from "./gameConfig.js";
import { countLivingCorals } from "./CoralManager.js";

/*
The ten years are grouped into chapters, each bringing one new idea, and every year has two or three goals that
the HUD lists with checkboxes (the "This year" card). Goals don't change how the reef behaves: they tell the
player what is worth doing right now. Finishing all of a year's goals earns the fish a heart.

To change what a year asks for, edit YEAR_PLANS. To add a kind of goal, add it to GOALS.
*/

export const CHAPTERS = [
    { number: 1, title: "Home reef", years: [1] },
    { number: 2, title: "First heatwave", years: [2, 3] },
    { number: 3, title: "Back to back", years: [4, 5] },
    { number: 4, title: "Dirty water", years: [6] },
    { number: 5, title: "The long summer", years: [7, 8, 9] },
    { number: 6, title: "Legacy", years: [10] },
];

export const getChapter = (year) => CHAPTERS.find(chapter => chapter.years.includes(year)) ?? CHAPTERS.at(-1);

// brief: what the year card says is coming. goals: [kind, amount]. winterJob: "algae", "snails" or nothing.
export const YEAR_PLANS = {
    1: { brief: "A calm year. Get to know your reef before the heat arrives.", goals: [["eat", 2], ["nest", 3], ["look", 1]] },
    2: { brief: "Swim into the green Cloudy bubbles to shade your reef.", goals: [["cloudy", 2], ["stressUnder", 40]], winterJob: "algae" },
    3: { brief: "A calm summer, but a grouper is hunting. Press E at your nest to hide.", goals: [["grouper", 1], ["collect", 3]] },
    4: { brief: "Hotter, and next summer follows straight on. Blue Cool Current bubbles cool the water.", goals: [["cool", 1], ["stressUnder", 50]], winterJob: "snails" },
    5: { brief: "No rest this year: the reef starts the summer already tired.", goals: [["stressUnder", 70], ["lostAtMost", 10]], winterJob: "algae" },
    6: { brief: "No heatwave, but the pipe is leaking. Carry nest pieces to it and plug it.", goals: [["plug", 3], ["nestStage", 2]] },
    7: { brief: "Three hot summers in a row begin. Red Hot Plumes drift towards you: swim around them.", goals: [["noPlume", 0], ["stressUnder", 65]], winterJob: "algae" },
    8: { brief: "Hotter again, and a grouper arrives in the middle of it.", goals: [["stressUnder", 85], ["grouper", 1]], winterJob: "snails" },
    9: { brief: "The hottest summer of all. Use every bubble you can reach.", goals: [["aliveShare", 50], ["lostAtMost", 25]], winterJob: "algae" },
    10: { brief: "The heat has passed. Enjoy the reef you kept alive.", goals: [["collect", 5], ["nestStage", 3], ["lap", 2]] },
};

const aliveShare = (scene) => countLivingCorals(scene) / scene.corals.length * 100;

// A goal either counts up to a target (count), or holds for the whole year unless it is broken (broken)
const GOALS = {
    eat: (n) => ({ text: `Eat ${n} shellfish`, count: (s) => s.yearStats.eaten }),
    nest: (n) => ({ text: `Add ${n} pieces to your nest`, count: (s) => s.yearStats.placed }),
    look: (n) => ({ text: n === 1 ? "Click a coral to check on it" : `Check on ${n} corals`, count: (s) => s.yearStats.looked }),
    cloudy: (n) => ({ text: `Pop ${n} Cloudy bubbles`, count: (s) => s.yearStats.cloudy }),
    cool: (n) => ({ text: n === 1 ? "Pop a Cool Current bubble" : `Pop ${n} Cool Current bubbles`, count: (s) => s.yearStats.cool }),
    collect: (n) => ({ text: n >= 5 ? "Find every kind of coral" : `Find ${n} kinds of coral`, count: (s) => s.collectedCorals.size }),
    nestStage: (n) => ({ text: n >= 3 ? "Finish your nest" : "Grow your nest to stage 2", count: (s) => s.homeStage + 1 }),
    plug: (n) => ({ text: `Plug the pipe with ${n} nest pieces`, count: (s) => s.pipeRocks }),
    grouper: () => ({ text: "Send the grouper away: hide in your nest", count: (s) => s.yearStats.grouperGone }),
    lap: () => ({ text: "Visit both ends of your reef", count: (s) => (s.yearStats.sawLeft ? 1 : 0) + (s.yearStats.sawRight ? 1 : 0) }),
    algae: (n) => ({ text: `Winter: graze the algae off ${n} corals`, count: (s) => s.yearStats.pestsCleared }),
    snails: (n) => ({ text: `Winter: eat ${n} coral-eating snails`, count: (s) => s.yearStats.pestsCleared }),
    replant: (n) => ({ text: n === 1 ? "Winter: replant a coral fragment" : `Winter: replant ${n} coral fragments`, count: (s) => s.yearStats.replanted }),
    stressUnder: (n) => ({ text: `Keep reef stress under ${n}%`, broken: (s) => s.yearStats.peak >= n }),
    lostAtMost: (n) => ({ text: `Lose no more than ${n} corals`, broken: (s) => s.yearStats.lost > n }),
    noPlume: () => ({ text: "Don't touch a red Hot Plume", broken: (s) => s.yearStats.plumesHit > 0 }),
    aliveShare: (n) => ({ text: n === 50 ? "Keep at least half the reef alive" : `Keep ${n}% of the reef alive`, broken: (s) => aliveShare(s) < n }),
};

export function newYearStats() {
    return {
        eaten: 0, placed: 0, looked: 0, cloudy: 0, cool: 0, plumesHit: 0, peak: 0, lost: 0,
        pestsCleared: 0, replanted: 0, grouperGone: 0, sawLeft: false, sawRight: false,
    };
}

export class Objectives {
    constructor(scene) {
        this.scene = scene;
        this.goals = [];
        this.met = 0;    // over the whole game, for the end screen
        this.total = 0;
    }

    startYear(year) {
        this.goals = [];
        for (const [kind, amount] of YEAR_PLANS[Math.min(year, GAME_YEARS)].goals) this.add(kind, amount);
    }

    // Also used part way through a year, when winter brings its job
    add(kind, amount) {
        this.goals.push({ id: `${kind}-${this.goals.length}`, target: amount, state: "todo", progress: 0, ...GOALS[kind](amount) });
    }

    // Called a few times a second. Returns true if a goal was just completed, so the scene can make a sound.
    update() {
        let justDone = false;
        for (const goal of this.goals) {
            if (goal.state !== "todo") continue;
            if (goal.count) {
                goal.progress = Math.min(goal.count(this.scene), goal.target);
                if (goal.progress >= goal.target) {
                    goal.state = "done";
                    justDone = true;
                }
            } else if (goal.broken(this.scene)) {
                goal.state = "failed";
            }
        }
        return justDone;
    }

    // The year is over: goals that only had to hold are met, and unfinished counts are missed. If the year ended
    // because the game was lost, nothing still open counts as met.
    finishYear(lost = false) {
        this.update();
        for (const goal of this.goals) {
            if (goal.state === "todo") goal.state = goal.count || lost ? "failed" : "done";
        }
        const met = this.goals.filter(goal => goal.state === "done").length;
        this.met += met;
        this.total += this.goals.length;
        return { met, total: this.goals.length };
    }

    // What the HUD needs to draw the list
    getList() {
        return this.goals.map(({ id, text, state, progress, target, count }) => ({
            id, text, state, progress: count && target > 1 ? `${progress}/${target}` : null,
        }));
    }
}
