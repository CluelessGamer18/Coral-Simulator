import Phaser from "phaser";
import { asset } from "../assetUrl";
import { getSettings } from "../settings.js";

/*
The kinds of coral on the reef. Each kind has one description and several drawings (variants), so a patch of
the same kind doesn't look copied and pasted.

To add a drawing: put the full-size art in assets-src/corals, run scripts/build-art.py, load it in Preloader.js
and add its key to the kind's variants. To add a kind: add an entry here. Every kind is a collectable (see
collectCoral below), and the reef is always planted with at least one patch of each.

bleachRate is how fast the kind takes on heat stress, as a percentage of the reef's own rate, and endurance is
how long it can stay fully bleached before it starves, against the average. Surveys of bleached reefs find table
and branching Acropora among the first corals to bleach and die, with sturdier, slower-growing corals lasting
longer, so that's the order here. heat is the same thing in words, for the coral's popup.
sway is how far it leans in the current, in degrees.
*/
export const CORAL_KINDS = {
  columnar: {
    name: 'Columnar',
    scientificName: 'Dendrogyra cylindrus',
    info: 'Pillar coral is naturally uncommon and grows slowly, which makes recovery difficult after losses. Stony coral tissue loss disease has caused severe declines in parts of its range, and NOAA lists the species as endangered under the U.S. Endangered Species Act.',
    imgType: 'branch',
    bleachRate: 80,
    endurance: 1.3,
    heat: 'Sturdy: slow to bleach, and it can last a while once it has.',
    sway: 0.45,
    variants: ['Columnar-1', 'Columnar-2', 'Columnar-3', 'Columnar-4'],
  },
  digitate: {
    name: 'Digitate',
    scientificName: 'Acropora digitifera',
    info: 'Acropora digitifera forms low or upright colonies of narrow, finger-like branches, each with a prominent corallite at its tip. It lives on shallow tropical reefs across the Indo-Pacific, where marine heat can trigger bleaching.',
    imgType: 'branch',
    bleachRate: 110,
    endurance: 0.9,
    heat: 'Sensitive: branching corals like this bleach early in a heatwave.',
    sway: 2.25,
    variants: ['Digitate-1', 'Digitate-2', 'Digitate-3', 'Digitate-4'],
  },
  folios: {
    name: 'Foliose',
    scientificName: 'Montipora foliosa',
    info: 'Montipora foliosa grows in broad, thin plates that spread outward and can overlap in tiers. This flattened, leaf-like growth form sets it apart from corals that build upright branches.',
    imgType: 'branch',
    bleachRate: 95,
    endurance: 1.0,
    heat: 'In between: its thin plates bleach at about the pace of the reef as a whole.',
    sway: 1.25,
    variants: ['Folios-1', 'Folios-2'],
  },
  tabular: {
    name: 'Tabular',
    scientificName: 'Acropora clathrata',
    info: 'Known as lattice table coral, Acropora clathrata forms broad colonies with a table-like outline. It occurs across the Indo-Central Pacific, from the Red Sea to western Australia.',
    imgType: 'tabular',
    bleachRate: 125,
    endurance: 0.8,
    heat: 'Very sensitive: table corals are usually the first to bleach, and the first to die.',
    sway: 0.45,
    variants: ['Tabular-1', 'Tabular-2', 'Tabular-3'],
  },
  flatTabular: {
    name: 'Flat Tabular',
    scientificName: 'Acropora clathrata',
    info: 'Known as lattice table coral, Acropora clathrata forms broad colonies with a table-like outline. It occurs across the Indo-Central Pacific, from the Red Sea to western Australia.',
    imgType: 'tabular',
    bleachRate: 120,
    endurance: 0.8,
    heat: 'Very sensitive: table corals are usually the first to bleach, and the first to die.',
    sway: 0.45,
    variants: ['Flat-Tabular-1', 'Flat-Tabular-2', 'Flat-Tabular-3'],
  },
};
export const CORAL_KIND_IDS = Object.keys(CORAL_KINDS);

// One entry per drawing, named after its kind: columnar1, columnar2, ... flatTabular3
const coralTypes = {};
for (const [kindId, kind] of Object.entries(CORAL_KINDS)) {
  kind.variants.forEach((key, i) => {
    coralTypes[`${kindId}${i + 1}`] = { ...kind, key, kind: kindId, generatedStages: null }; // the bleach stages are made when first needed
  });
}

const coralStatuses = ['Healthy', 'Ok', 'Stressed', 'Bleached', 'Dead']; // forwarded to React frontend for display
// One line on why the coral looks the way it does, for each status
const coralReasons = [
  'Its algae are thriving, and they feed it and give it its colour.',
  'The warm water is starting to bother the algae living inside it.',
  'Hot water and strong light are driving out its algae. It is turning pale.',
  'Nearly all of its algae are gone, so it is white and starving. It can still recover if the water cools soon.',
  'It went too long without its algae and starved. Seaweed is growing over the skeleton.',
];
const ALGAE_SHOWN = 12; // algae in the microscope picture of a healthy coral
const STARVE_SECONDS = 15; // how long an average coral can stay fully bleached before it dies
const DEAD_TINT = 0x8f9478; // a dead coral's skeleton is soon covered in dull green-brown turf algae
const REPLANT_SCALE = 0.55; // a replanted fragment starts this much of a full colony's size
const REPLANT_GROW_MS = 90000;
export const BLEACH_STAGE_COUNT = 10;

const coralImgPathsTabular = [ // microscope images of tabular coral bleach stages (for sending to React frontend)
  asset('microscopes/healthy_tabular_microscope.png'),
  asset('microscopes/ok_tabular_microscope.png'),
  asset('microscopes/stressed_tabular_microscope.png'),
  asset('microscopes/bleached_tabular_microscope.png'),
  asset('microscopes/dead_tabular_microscope.png')
];

const coralImgPathsBranch = [ // microscope images of branch coral bleach stages (for sending to React frontend)
  asset('microscopes/healthy_microscope.png'),
  asset('microscopes/ok_microscope.png'),
  asset('microscopes/stressed_microscope.png'),
  asset('microscopes/bleached_microscope.png'),
  asset('microscopes/dead_microscope.png')
];

// What the coral info popup shows for a coral of this type with this much stress (0-100)
export function getCoralInfo(typeName, stress, dead = false) {
  const type = coralTypes[typeName];
  const statusStage = dead
    ? coralStatuses.length - 1
    : Math.min(Math.floor(stress / 25), coralStatuses.length - 2);

  return {
    name: type.name,
    scientificName: type.scientificName,
    status: coralStatuses[statusStage],
    statusStage,
    statuses: coralStatuses,
    stress: Math.round(dead ? 100 : stress),
    reason: coralReasons[statusStage],
    heat: type.heat,
    algaeLeft: dead ? 0 : Math.round(ALGAE_SHOWN * (1 - stress / 100)),
    algaeTotal: ALGAE_SHOWN,
    info: type.info,
    img: (type.imgType === 'branch' ? coralImgPathsBranch : coralImgPathsTabular)[statusStage],
  };
}

// z levels for corals, which determine their y position and rendering depth in the scene
const depthLevels = [-10, 120, 180];

/* main function to create coral instances in the scene. Called when game scene is created. */
export function createCorals(scene) {
    scene.corals = [];
    scene.coralCullX = undefined;

  const sandbarWidth = 800; // create a sandbar with a width of 800 pixels
  const coralClearance = 100 // half of the max coral width so it doesnt grow on the sandbar
  const sandbarStart = (scene.WORLD_WIDTH - sandbarWidth) / 2; // where the sandbar begins
  const sandbarEnd = sandbarStart + sandbarWidth;

  // One drawing of every kind is handed out between the two reefs, so the whole collection can always be found
  const oneOfEachKind = Phaser.Utils.Array.Shuffle(
    Object.values(CORAL_KINDS).map(kind => Phaser.Utils.Array.GetRandom(kind.variants))
  );
  const half = Math.ceil(oneOfEachKind.length / 2);

  createCoralGroup(scene, 100, coralClearance, sandbarStart - coralClearance, oneOfEachKind.slice(0, half));
  createCoralGroup(scene, 100, sandbarEnd + coralClearance, scene.WORLD_WIDTH - coralClearance, oneOfEachKind.slice(half));
}

/* helper function to create a group of coral instances with random types and positions. */
function createCoralGroup(scene, count, minX, maxX, requiredImages) {
  const spawns = createCoralSpawnPlan(count, minX, maxX, requiredImages);

  for (const spawn of spawns) {
    const { x, yOffset, typeName, depth } = spawn;
    const type = coralTypes[typeName];

    const coral = scene.add
      .image(
        x,
        scene.WORLD_HEIGHT - depthLevels[depth] + yOffset,
        type.key,
      )
      .setOrigin(0.5, 1)
      .setDepth(7 - depth);

    // The art in public/assets/corals is 1.5x this size (see scripts/build-art.py), so there's detail to spare
    // when a coral pulses or the camera zooms in on the nest
    const coralScale = Math.min(200 / coral.width, 170 / coral.height, 1);
    coral.setScale(coralScale);
    coral.baseScale = coralScale;

    coral.setInteractive(); // corals are clickable
    coral.type = typeName;

    if (
      type.generatedStages === null ||
      (type.generatedStages && type.generatedStages.some(key => !scene.textures.exists(key)))
    ) {
      type.generatedStages = createBleachStages(scene, type.key);
    }

    // No two colonies are quite alike, even of the same kind, so each has its own sensitivity and endurance
    coral.sensitivity = type.bleachRate / 100 * Phaser.Math.FloatBetween(0.8, 1.2);
    coral.endurance = STARVE_SECONDS * type.endurance * Phaser.Math.FloatBetween(0.5, 1.5);
    coral.stress = 0;
    coral.starved = 0; // seconds spent fully bleached
    coral.bleachStage = 0;
    coral.dead = false;

    coral.on('pointerover', () => { // hover effect
      coral.setTint(0xffcc88);

      coral.coralPulse?.stop(); // never run two pulses on the same coral
      coral.coralPulse = scene.tweens.add({
        targets: coral,
        scale: { from: coral.baseScale, to: coral.baseScale * 1.05 },
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      });
    });

    coral.on('pointerout', () => { // end hover effect
      if (coral.dead) coral.setTint(DEAD_TINT);
      else coral.clearTint();

      if (coral.coralPulse) {
        coral.coralPulse.stop();
        coral.coralPulse = null;
      }
      coral.setScale(coral.baseScale); // stopping the pulse mid-way leaves the coral at whatever size it had reached
    });

    // On a click or tap: open the coral's info popup, and add its kind to the collection. Pressing and holding
    // steers the fish instead (PointerControls.js), so this waits for the release and checks it was quick.
    coral.on('pointerup', (pointer) => {
      if (!scene.tutorialComplete || scene.simEnd || scene.coralInfoOpen || !isTap(pointer)) return;

      scene.coralInfoOpen = true;
      scene.pointerGoal = null;
      const collection = collectCoral(scene, coral);
      scene.yearStats.looked++;
      scene.game.events.emit('coralInfo', { ...getCoralInfo(coral.type, coral.stress, coral.dead), collection });
    });

    // Each coral leans back and forth at its own pace (see swayCorals)
    coral.swayAngle = Phaser.Math.FloatBetween(type.sway * 0.7, type.sway * 1.3);
    coral.swaySpeed = Math.PI / Phaser.Math.Between(4000, 6000); // radians per ms: one lean each way every 8 to 12 seconds
    coral.swayPhase = Phaser.Math.FloatBetween(0, Math.PI * 2);

    scene.corals.push(coral);
  }
}

// Helper function to seperate the coral types when spawning them in.
// The first patches are made of requiredImages, one patch each; the rest are random.
function createCoralSpawnPlan(count, minX, maxX, requiredImages = []) {
  // --- Lookup: image key -> coral type names that use that image ---
  const typeNamesByImage = {};
  for (const [typeName, type] of Object.entries(coralTypes)) {
    (typeNamesByImage[type.key] ??= []).push(typeName);
  }
  const imageKeys = Object.keys(typeNamesByImage);
  const maxDepth = depthLevels.length - 1;
 
  const mixedPatchChance = 0.05;  // rare patch has a second species at its edge
  const minPatchSize = 3;
  const maxPatchSize = 12;
  const stepX = 35;               // how far a "larva" settles from its parent 
  const stepY = 8;
  const depthDriftChance = 0.3;   // chance a colony sits one layer off its parent
 
  // approximate normal distribution (Box-Muller)
  const gaussian = () => {
    const u = 1 - Math.random();
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
 
  // uneven patch sizes (big and small clumps)
  const patchSizes = [];
  let remaining = count;
  while (remaining > 0) {
    let size = Math.min(remaining, Phaser.Math.Between(minPatchSize, maxPatchSize));
    if (remaining - size < minPatchSize) size = remaining; // avoid tiny leftovers
    patchSizes.push(size);
    remaining -= size;
  }
 
  // irregular patch centers with gaps of bare sand between them
  const centers = [];
  for (let i = 0; i < patchSizes.length; i++) {
    let best = null;
    let bestDist = -1;
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidate = Phaser.Math.FloatBetween(minX, maxX);
      const dist = centers.length
        ? Math.min(...centers.map(c => Math.abs(c - candidate)))
        : Infinity;
      if (dist > bestDist) {
        best = candidate;
        bestDist = dist;
      }
    }
    centers.push(best);
  }
 
  // grow each patch outward from a founder colony
  const spawns = [];
 
  patchSizes.forEach((patchSize, patchIndex) => {
    const center = centers[patchIndex];
    const baseY = Phaser.Math.Between(-35, 35);
    const baseDepth = Phaser.Math.Between(0, maxDepth);
    const maxRadius = 25 + patchSize * 7; // bigger patches may spread wider
 
    const imageKey = requiredImages[patchIndex] ?? Phaser.Utils.Array.GetRandom(imageKeys);
    const colonies = [{ x: center, y: baseY, depth: baseDepth }];
 
    for (let i = 1; i < patchSize; i++) {
      // New colonies settle near an existing one -> organic, blobby clusters
      const parent = Phaser.Utils.Array.GetRandom(colonies);
 
      let depth = parent.depth;
      if (Math.random() < depthDriftChance) {
        depth += Math.random() < 0.5 ? -1 : 1;
      }
 
      colonies.push({
        x: Phaser.Math.Clamp(
          parent.x + gaussian() * stepX,
          Math.max(minX, center - maxRadius),
          Math.min(maxX, center + maxRadius)
        ),
        y: Phaser.Math.Clamp(parent.y + gaussian() * stepY, baseY - 30, baseY + 30),
        depth: Phaser.Math.Clamp(depth, 0, maxDepth)
      });
    }
 
    // rare mixed patch: a different species along the outer edge only
    const isMixedPatch = imageKeys.length > 1 && Math.random() < mixedPatchChance;
    const edgeImageKey = isMixedPatch
      ? Phaser.Utils.Array.GetRandom(imageKeys.filter(key => key !== imageKey))
      : null;
    const edgeColonies = new Set();
 
    if (isMixedPatch) {
      [...colonies]
        .sort((a, b) => Math.abs(b.x - center) - Math.abs(a.x - center))
        .slice(0, Math.max(1, Math.ceil(patchSize * 0.25)))
        .forEach(colony => edgeColonies.add(colony));
    }
 
    for (const colony of colonies) {
      const key = edgeColonies.has(colony) ? edgeImageKey : imageKey;
      spawns.push({
        x: colony.x,
        yOffset: colony.y,
        typeName: Phaser.Utils.Array.GetRandom(typeNamesByImage[key]),
        depth: colony.depth
      });
    }
  });
 
  return spawns;
}

const TAP_MS = 350;
const TAP_DISTANCE = 16;
export function isTap(pointer) {
  return pointer.getDuration() <= TAP_MS && pointer.getDistance() <= TAP_DISTANCE;
}

// Adds the coral's kind to the player's collection the first time one of that kind is opened, with a little
// "New coral!" over the coral. Returns what the popup needs to show: { kind, isNew, collected, total }.
function collectCoral(scene, coral) {
  const { kind } = coralTypes[coral.type];
  const isNew = !scene.collectedCorals.has(kind);
  const total = CORAL_KIND_IDS.length;

  if (isNew) {
    scene.collectedCorals.add(kind);
    scene.emitStats();

    const text = scene.add.text(coral.x, coral.y - coral.displayHeight, `New coral! ${scene.collectedCorals.size}/${total}`, {
      fontSize: '26px',
      fontFamily: 'Poppins, sans-serif',
      fontStyle: 'bold',
      color: '#ffe3a3',
      stroke: '#0b2e3a',
      strokeThickness: 5
    }).setOrigin(0.5, 1).setDepth(20);

    scene.tweens.add({
      targets: text,
      y: text.y - 60,
      alpha: 0,
      duration: 1400,
      ease: 'Cubic.out',
      onComplete: () => text.destroy()
    });
  }

  if (isNew && scene.collectedCorals.size === total) {
    scene.game.events.emit('random-event', {
      title: 'Collection Complete',
      message: `You've found all ${total} kinds of coral on your reef. Now keep them alive!`,
      good: true,
    });
  }

  return { kind, isNew, collected: scene.collectedCorals.size, total };
}

// Leans every coral on screen back and forth. One sine each per frame, in place of 200 tweens that ran whether
// or not their coral could be seen. Uses the scene's clock, so the reef holds still while the game is paused.
export function swayCorals(scene) {
  if (getSettings().reducedMotion) return;
  const now = scene.time.now;
  for (const coral of scene.corals) {
    if (coral.visible) coral.angle = Math.sin(now * coral.swaySpeed + coral.swayPhase) * coral.swayAngle;
  }
}

const CULL_MARGIN = 150; // a coral is at most 200 px wide and sways a little, so this keeps it drawn until it's well out of view
const CULL_STEP = 64;    // how far the camera has to move before the corals are checked again

// Phaser draws every image whether or not the camera can see it. Only about a quarter of the reef is on screen at
// once, so corals out of view are hidden, which also skips their sway. Called every frame, but only does anything once
// the view has moved by CULL_STEP.
export function cullCorals(scene) {
  // The camera only ever zooms in, which narrows the view, so its unzoomed width covers every case
  const { scrollX, width } = scene.cameras.main;
  if (scene.coralCullX !== undefined && Math.abs(scrollX - scene.coralCullX) < CULL_STEP) return;
  scene.coralCullX = scrollX;

  const left = scrollX - CULL_MARGIN - CULL_STEP;
  const right = scrollX + width + CULL_MARGIN + CULL_STEP;
  for (const coral of scene.corals) {
    const inView = coral.x > left && coral.x < right;
    if (inView === coral.visible) continue;
    coral.setVisible(inView);
  }
}

export function createBleachStages(scene, coralType) {
  const stages = generateBleachStages(scene, coralType);
  let step;
  do {
    step = stages.next();
  } while (!step.done);
  return step.value;
}

// Makes the bleach stages for every coral type ahead of time, a little per next() call, so a scene can spread
// the work over many frames. A stage is only added once it's finished, so stopping part way leaves nothing half made. The tutorial runs this in the background so the main game doesn't freeze while
// createCorals() makes them all at once. Textures belong to the whole game, so the main game reuses them.
export function* prepareBleachStages(scene) {
  for (const type of Object.values(coralTypes)) {
    type.generatedStages = yield* generateBleachStages(scene, type.key);
  }
}

// Each stage is a copy of the coral's texture that is more washed out and whiter than the last. Yields often (after
// reading the source, after every few rows, and after each stage is uploaded) so the work can be spread over frames,
// and returns every stage's texture key, the original first. Stages that already exist are skipped.
function* generateBleachStages(scene, coralType) {
  const keys = [coralType];
  const source = scene.textures.get(coralType).getSourceImage();
  const { width, height } = source;
  let original, gray; // the source's pixels, only read if a stage still needs making

  for (let stage = 1; stage <= BLEACH_STAGE_COUNT; stage++) {
    const key = `${coralType}-bleach-${stage}`;
    keys.push(key);
    if (scene.textures.exists(key)) continue;

    // Read once for all of this coral's stages, rather than drawing and reading it back for every stage
    if (!original) {
      ({ original, gray } = readPixels(source));
      yield;
    }

    const canvas = createPixelCanvas(width, height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const image = context.createImageData(width, height);

    for (let row = 0; row < height; row += BLEACH_ROWS_PER_STEP) {
      const lastRow = Math.min(row + BLEACH_ROWS_PER_STEP, height);
      bleachPixels(original, gray, image.data, stage / BLEACH_STAGE_COUNT, row * width, lastRow * width);
      yield;
    }

    // Added once it's finished, so it's only uploaded to the GPU once
    context.putImageData(image, 0, 0);
    scene.textures.addCanvas(key, canvas);
    yield;
  }

  return keys;
}

const BLEACH_ROWS_PER_STEP = 100; // rows of a stage to make between yields

// A canvas kept in ordinary memory rather than on the GPU, like Phaser's own canvas textures. Reading and writing
// pixels is quicker there, and faint edge pixels come out exactly as they did before.
function createPixelCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// The source image's pixels, and the brightness of each one
function readPixels(source) {
  const canvas = createPixelCanvas(source.width, source.height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(source, 0, 0);
  const original = context.getImageData(0, 0, source.width, source.height).data;

  const gray = new Float64Array(source.width * source.height);
  for (let i = 0, p = 0; i < original.length; i += 4, p++) {
    gray[p] = 0.2126 * original[i] + 0.7152 * original[i + 1] + 0.0722 * original[i + 2];
  }
  return { original, gray };
}

// Writes a washed-out, whitened copy of pixels first to last - 1 of the original into pixels (which starts fully
// transparent). For each colour channel that's
//   desaturated = gray + (channel - gray) * (1 - strength)
//   result = round(desaturated + (255 - desaturated) * strength * 0.45)
// rearranged so each channel is a single multiply-add, and each pixel is read and written as one 32-bit value
// (byte order RGBA in memory, so red is the lowest byte on the little-endian machines browsers run on).
// Kept out of the generator above, because V8 optimizes a hot loop in a plain function much better.
function bleachPixels(original, gray, pixels, strength, first, last) {
  const whitening = strength * 0.45;
  const grayWeight = strength * (1 - whitening);
  const colourWeight = (1 - strength) * (1 - whitening);
  const offset = 255 * whitening + 0.5; // + 0.5 so truncating with | 0 rounds like Math.round

  const source = new Uint32Array(original.buffer, original.byteOffset, original.length / 4);
  const result = new Uint32Array(pixels.buffer, pixels.byteOffset, pixels.length / 4);

  for (let p = first; p < last; p++) {
    const rgba = source[p];
    const alpha = rgba >>> 24;
    if (alpha === 0) continue; // invisible, so leave it transparent

    const base = gray[p] * grayWeight + offset;
    const red = (base + (rgba & 255) * colourWeight) | 0;
    const green = (base + ((rgba >>> 8) & 255) * colourWeight) | 0;
    const blue = (base + ((rgba >>> 16) & 255) * colourWeight) | 0;
    result[p] = ((alpha << 24) | (blue << 16) | (green << 8) | red) >>> 0;
  }
}

export function getBleachStage(stressAmount) {
  return Math.floor(Phaser.Math.Clamp(stressAmount, 0, 100) / 100 * BLEACH_STAGE_COUNT);
}

/*
Passes the reef's change in heat stress on to every living coral. Called every frame while the clock runs.

Rising stress is scaled by the coral's own sensitivity, so the delicate kinds pale first. A coral that reaches
100 is fully bleached: it has lost the algae that feed it, and it starves if it stays that way for longer than
it can endure. Corals that hold out until the water cools recover with the rest of the reef, which is why the
reef dies a few colonies at a time and not all at once. Returns how many died in this step.
*/
export function updateCoralStress(scene, stressDelta, deltaMs) {
  const seconds = deltaMs / 1000;
  let died = 0;

  for (const coral of scene.corals) {
    if (coral.dead) continue;

    const change = stressDelta > 0 ? stressDelta * coral.sensitivity : stressDelta;
    coral.stress = Phaser.Math.Clamp(coral.stress + change, 0, 100);

    if (coral.stress >= 100) {
      coral.starved += seconds;
      if (coral.starved >= coral.endurance) {
        killCoral(coral);
        died++;
      }
    } else if (stressDelta < 0) {
      coral.starved = Math.max(coral.starved - seconds / 2, 0);
    }
    showBleachStage(coral);
  }
  return died;
}

function killCoral(coral) {
  coral.stress = 100;
  coral.dead = true;
  coral.setTint(DEAD_TINT);
}

// Extra recovery (or, with a negative amount, extra harm) for the corals around a spot: the winter jobs use it
export function changeStressNear(scene, x, radius, amount) {
  for (const coral of scene.corals) {
    if (coral.dead || Math.abs(coral.x - x) > radius) continue;
    coral.stress = Phaser.Math.Clamp(coral.stress + amount, 0, 100);
    if (amount < 0) coral.starved = 0;
    showBleachStage(coral);
  }
}

// A fragment of living coral planted on a dead colony's spot grows into a new colony of the same kind
export function replantCoral(scene, coral) {
  coral.dead = false;
  coral.stress = 0;
  coral.starved = 0;
  coral.clearTint();
  showBleachStage(coral);

  const fullScale = coral.fullScale ?? coral.baseScale;
  coral.fullScale = fullScale;
  coral.baseScale = fullScale * REPLANT_SCALE;
  coral.setScale(coral.baseScale);
  scene.tweens.add({
    targets: coral,
    baseScale: fullScale,
    duration: REPLANT_GROW_MS,
    onUpdate: () => { if (!coral.coralPulse) coral.setScale(coral.baseScale); },
  });
}

export function countLivingCorals(scene) {
  let alive = 0;
  for (const coral of scene.corals) if (!coral.dead) alive++;
  return alive;
}

// Swaps the coral's texture when its stress crosses into another bleach stage, and not otherwise
function showBleachStage(coral) {
  const bleachStage = getBleachStage(coral.stress);
  if (coral.bleachStage === bleachStage) return;

  coral.bleachStage = bleachStage;
  coral.setTexture(coralTypes[coral.type].generatedStages[bleachStage]);
}

export function killCorals(scene) {
  scene.corals.forEach(coral => {
    if (!coral.dead) killCoral(coral);
    showBleachStage(coral);
  });
}

/* helper function to reset coral states. Called when game is reset. */
export function resetCorals(scene) {
  scene.corals.forEach(coral => {
    coral.stress = 0;
    coral.starved = 0;
    coral.dead = false;
    coral.clearTint();
    showBleachStage(coral);
  });
}
