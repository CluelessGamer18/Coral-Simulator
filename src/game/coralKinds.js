import { asset } from "../assetUrl.js";

/*
The kinds of coral on the reef. Phaser-free, so the HUD can show the collection without downloading the game.

The words used for corals everywhere in the code:
  - kind: a species and growth form, like columnar. Each kind is one collectable.
  - variant: one drawing of a kind, named by its texture key, like columnar1. A patch of one kind mixes its variants
    so it doesn't look copied and pasted.
  - microscopeSet: which set of microscope pictures the coral popup shows for the kind.

To add a drawing: put the full-size art in assets-src/corals, run scripts/build-art.py and add its key to the kind's
variants (the Preloader loads every variant). To add a kind: add an entry here. Every kind is a collectable, and the
reef is always planted with at least one patch of each.

bleachRate is how fast the kind takes on stress, as a percentage of the reef's own rate.
sway is how far it leans in the current, in degrees.
*/
export const CORAL_KINDS = {
    columnar: {
        name: "Columnar",
        scientificName: "Dendrogyra cylindrus",
        info: "Pillar coral is naturally uncommon and grows slowly, which makes recovery difficult after losses. Stony coral tissue loss disease has caused severe declines in parts of its range, and NOAA lists the species as endangered under the U.S. Endangered Species Act.",
        microscopeSet: "branch",
        bleachRate: 100,
        sway: 0.45,
        variants: ["columnar1", "columnar2", "columnar3", "columnar4"],
    },
    digitate: {
        name: "Digitate",
        scientificName: "Acropora digitifera",
        info: "Acropora digitifera forms low or upright colonies of narrow, finger-like branches, each with a prominent corallite at its tip. It lives on shallow tropical reefs across the Indo-Pacific, where marine heat can trigger bleaching.",
        microscopeSet: "branch",
        bleachRate: 100,
        sway: 2.25,
        variants: ["digitate1", "digitate2", "digitate3", "digitate4"],
    },
    foliose: {
        name: "Foliose",
        scientificName: "Montipora foliosa",
        info: "Montipora foliosa grows in broad, thin plates that spread outward and can overlap in tiers. This flattened, leaf-like growth form sets it apart from corals that build upright branches.",
        microscopeSet: "branch",
        bleachRate: 100,
        sway: 1.25,
        variants: ["foliose1", "foliose2"],
    },
    tabular: {
        name: "Tabular",
        scientificName: "Acropora clathrata",
        info: "Known as lattice table coral, Acropora clathrata forms broad colonies with a table-like outline. It occurs across the Indo-Central Pacific, from the Red Sea to western Australia.",
        microscopeSet: "tabular",
        bleachRate: 100,
        sway: 0.45,
        variants: ["tabular1", "tabular2", "tabular3"],
    },
    flatTabular: {
        name: "Flat Tabular",
        scientificName: "Acropora clathrata",
        info: "Known as lattice table coral, Acropora clathrata forms broad colonies with a table-like outline. It occurs across the Indo-Central Pacific, from the Red Sea to western Australia.",
        microscopeSet: "tabular",
        bleachRate: 100,
        sway: 0.45,
        variants: ["flatTabular1", "flatTabular2", "flatTabular3"],
    },
};

export const CORAL_KIND_IDS = Object.keys(CORAL_KINDS);

// Every variant, by its texture key, with the kind it belongs to: { columnar1: { kindId: "columnar", ...kind }, ... }
export const CORAL_VARIANTS = Object.fromEntries(
    Object.entries(CORAL_KINDS).flatMap(([kindId, kind]) =>
        kind.variants.map((variant) => [variant, { ...kind, kindId, variant }]),
    ),
);

/**
 * The file a variant's drawing is in, under public/assets/corals: flatTabular1 is flat_tabular_1.png.
 * @param {string} variant
 */
export function coralFileName(variant) {
    return `${variant
        .replace(/([A-Z])/g, "_$1")
        .replace(/(\d+)$/, "_$1")
        .toLowerCase()}.png`;
}

const CORAL_STATUSES = ["Healthy", "Ok", "Stressed", "Bleached", "Dead"];

// Microscope pictures of each status, for the coral popup
const MICROSCOPE_IMAGES = {
    branch: ["healthy", "ok", "stressed", "bleached", "dead"].map((status) =>
        asset(`microscopes/${status}_microscope.png`),
    ),
    tabular: ["healthy", "ok", "stressed", "bleached", "dead"].map((status) =>
        asset(`microscopes/${status}_tabular_microscope.png`),
    ),
};

/**
 * What the coral popup shows for a coral.
 * @param {string} variant the coral's variant
 * @param {number} stress 0 to 100: each quarter is one status, from Healthy up to Bleached
 * @param {boolean} [dead]
 */
export function getCoralInfo(variant, stress, dead = false) {
    const kind = CORAL_VARIANTS[variant];
    const statusIndex = dead ? CORAL_STATUSES.length - 1 : Math.min(Math.floor(stress / 25), CORAL_STATUSES.length - 2);

    return {
        name: kind.name,
        scientificName: kind.scientificName,
        status: CORAL_STATUSES[statusIndex],
        info: kind.info,
        img: MICROSCOPE_IMAGES[kind.microscopeSet][statusIndex],
    };
}
