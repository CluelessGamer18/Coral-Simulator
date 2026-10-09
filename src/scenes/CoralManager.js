import Phaser from "phaser";
import { asset } from "../assetUrl";

/*  
Metadata for each coral type. 
    Append by adding new coral objects here, 
    and make sure to add corresponding images 
    in the assets folder and load them in 
    Preloader.js

    Any corals added here will be randomly generated in the scene, and will be affected by stress updates.
*/

var coralTypes = { 
  columnar1: {
    key: 'Columnar-1',
    name: 'Columnar',
    scientificName: 'Dendrogyra cylindrus',
    status: 'Healthy',
    info: 'Pillar coral is naturally uncommon and grows slowly, which makes recovery difficult after losses. Stony coral tissue loss disease has caused severe declines in parts of its range, and NOAA lists the species as endangered under the U.S. Endangered Species Act.',
    imgType: 'branch',
    img: asset('microscopes/healthy_microscope.png'),
    bleachRate: 100,
    generatedStages: null // placeholder for generated bleach stages, which will be created in Preloader.js
  },
  columnar2: {
    key: 'Columnar-2',
    name: 'Columnar',
    scientificName: 'Dendrogyra cylindrus',
    status: 'Healthy',
    info: 'Pillar coral is naturally uncommon and grows slowly, which makes recovery difficult after losses. Stony coral tissue loss disease has caused severe declines in parts of its range, and NOAA lists the species as endangered under the U.S. Endangered Species Act.',
    imgType: 'branch',
    img: asset('microscopes/healthy_microscope.png'),
    bleachRate: 100,
    generatedStages: null // placeholder for generated bleach stages, which will be created in Preloader.js
  },
  columnar3: {
    key: 'Columnar-3',
    name: 'Columnar',
    scientificName: 'Dendrogyra cylindrus',
    status: 'Healthy',
    info: 'Pillar coral is naturally uncommon and grows slowly, which makes recovery difficult after losses. Stony coral tissue loss disease has caused severe declines in parts of its range, and NOAA lists the species as endangered under the U.S. Endangered Species Act.',
    imgType: 'branch',
    img: asset('microscopes/healthy_microscope.png'),
    bleachRate: 100,
    generatedStages: null // placeholder for generated bleach stages, which will be created in Preloader.js
  },
  columnar4: {
    key: 'Columnar-4',
    name: 'Columnar',
    scientificName: 'Dendrogyra cylindrus',
    status: 'Healthy',
    info: 'Pillar coral is naturally uncommon and grows slowly, which makes recovery difficult after losses. Stony coral tissue loss disease has caused severe declines in parts of its range, and NOAA lists the species as endangered under the U.S. Endangered Species Act.',
    imgType: 'branch',
    img: asset('microscopes/healthy_microscope.png'),
    bleachRate: 100,
    generatedStages: null // placeholder for generated bleach stages, which will be created in Preloader.js
  },
  digitate1: {
    key: 'Digitate-1',
    name: 'Digitate',
    scientificName: "Acropora digitifera",
    status: 'Healthy',
    info: 'Acropora digitifera forms low or upright colonies of narrow, finger-like branches, each with a prominent corallite at its tip. It lives on shallow tropical reefs across the Indo-Pacific, where marine heat can trigger bleaching.',
    imgType: 'branch',
    img: asset('microscopes/healthy_microscope.png'),
    bleachRate: 100,
    generatedStages: null // placeholder for generated bleach stages, which will be created in Preloader.js
  },
  digitate2: {
    key: 'Digitate-2',
    name: 'Digitate',
    scientificName: "Acropora digitifera",
    status: 'Healthy',
    info: 'Acropora digitifera forms low or upright colonies of narrow, finger-like branches, each with a prominent corallite at its tip. It lives on shallow tropical reefs across the Indo-Pacific, where marine heat can trigger bleaching.',
    imgType: 'branch',
    img: asset('microscopes/healthy_microscope.png'),
    bleachRate: 100,
    generatedStages: null // placeholder for generated bleach stages, which will be created in Preloader.js
  },
  digitate3: {
    key: 'Digitate-3',
    name: 'Digitate',
    scientificName: "Acropora digitifera",
    status: 'Healthy',
    info: 'Acropora digitifera forms low or upright colonies of narrow, finger-like branches, each with a prominent corallite at its tip. It lives on shallow tropical reefs across the Indo-Pacific, where marine heat can trigger bleaching.',
    imgType: 'branch',
    img: asset('microscopes/healthy_microscope.png'),
    bleachRate: 100,
    generatedStages: null // placeholder for generated bleach stages, which will be created in Preloader.js
  },
  digitate4: {
    key: 'Digitate-4',
    name: 'Digitate',
    scientificName: "Acropora digitifera",
    status: 'Healthy',
    info: 'Acropora digitifera forms low or upright colonies of narrow, finger-like branches, each with a prominent corallite at its tip. It lives on shallow tropical reefs across the Indo-Pacific, where marine heat can trigger bleaching.',
    imgType: 'branch',
    img: asset('microscopes/healthy_microscope.png'),
    bleachRate: 100,
    generatedStages: null // placeholder for generated bleach stages, which will be created in Preloader.js
  },
  folios1: {
    key: 'Folios-1',
    name: 'Folios',
    scientificName: "Montipora foliosa",
    status: 'Healthy',
    info: 'Montipora foliosa grows in broad, thin plates that spread outward and can overlap in tiers. This flattened, leaf-like growth form sets it apart from corals that build upright branches.',
    imgType: 'branch',
    img: asset('microscopes/healthy_microscope.png'),
    bleachRate: 100,
    generatedStages: null // placeholder for generated bleach stages, which will be created in Preloader.js
  },
  folios2: {
    key: 'Folios-2',
    name: 'Folios',
    scientificName: "Montipora foliosa",
    status: 'Healthy',
    info: 'Montipora foliosa grows in broad, thin plates that spread outward and can overlap in tiers. This flattened, leaf-like growth form sets it apart from corals that build upright branches.',
    imgType: 'branch',
    img: asset('microscopes/healthy_microscope.png'),
    bleachRate: 100,
    generatedStages: null // placeholder for generated bleach stages, which will be created in Preloader.js
  },
  tabular1: {
    key: 'Tabular-1',
    name: 'Tabular',
    scientificName: "Acropora clathrata",
    status: 'Healthy',
    info: 'Known as lattice table coral, Acropora clathrata forms broad colonies with a table-like outline. It occurs across the Indo-Central Pacific, from the Red Sea to western Australia.',
    imgType: 'tabular',
    img: asset('microscopes/healthy_tabular_microscope.png'),
    bleachRate: 100,
    generatedStages: null // placeholder for generated bleach stages, which will be created in Preloader.js
  },
  tabular2: {
    key: 'Tabular-2',
    name: 'Tabular',
    scientificName: "Acropora clathrata",
    status: 'Healthy',
    info: 'Known as lattice table coral, Acropora clathrata forms broad colonies with a table-like outline. It occurs across the Indo-Central Pacific, from the Red Sea to western Australia.',
    imgType: 'tabular',
    img: asset('microscopes/healthy_tabular_microscope.png'),
    bleachRate: 100,
    generatedStages: null // placeholder for generated bleach stages, which will be created in Preloader.js
  },
  tabular3: {
    key: 'Tabular-3',
    name: 'Tabular',
    scientificName: "Acropora clathrata",
    status: 'Healthy',
    info: 'Known as lattice table coral, Acropora clathrata forms broad colonies with a table-like outline. It occurs across the Indo-Central Pacific, from the Red Sea to western Australia.',
    imgType: 'tabular',
    img: asset('microscopes/healthy_tabular_microscope.png'),
    bleachRate: 100,
    generatedStages: null // placeholder for generated bleach stages, which will be created in Preloader.js
  },
  flatTabular1: {
    key: 'Flat-Tabular-1',
    name: 'Flat Tabular',
    scientificName: "Acropora clathrata",
    status: 'Healthy',
    info: 'Known as lattice table coral, Acropora clathrata forms broad colonies with a table-like outline. It occurs across the Indo-Central Pacific, from the Red Sea to western Australia.',
    imgType: 'tabular',
    img: asset('microscopes/healthy_tabular_microscope.png'),
    bleachRate: 100,
    generatedStages: null // placeholder for generated bleach stages, which will be created in Preloader.js
  },
  flatTabular2: {
    key: 'Flat-Tabular-2',
    name: 'Flat Tabular',
    scientificName: "Acropora clathrata",
    status: 'Healthy',
    info: 'Known as lattice table coral, Acropora clathrata forms broad colonies with a table-like outline. It occurs across the Indo-Central Pacific, from the Red Sea to western Australia.',
    imgType: 'tabular',
    img: asset('microscopes/healthy_tabular_microscope.png'),
    bleachRate: 100,
    generatedStages: null // placeholder for generated bleach stages, which will be created in Preloader.js
  },
  flatTabular3: {
    key: 'Flat-Tabular-3',
    name: 'Flat Tabular',
    scientificName: "Acropora clathrata",
    status: 'Healthy',
    info: 'Known as lattice table coral, Acropora clathrata forms broad colonies with a table-like outline. It occurs across the Indo-Central Pacific, from the Red Sea to western Australia.',
    imgType: 'tabular',
    img: asset('microscopes/healthy_tabular_microscope.png'),
    bleachRate: 100,
    generatedStages: null // placeholder for generated bleach stages, which will be created in Preloader.js
  },
};

const coralStatuses = ['Healthy', 'Ok', 'Stressed', 'Bleached', 'Dead']; // forwarded to React frontend for display

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

// z levels for corals, which determine their y position and rendering depth in the scene
const depthLevels = [-10, 120, 180];


/* main function to create coral instances in the scene. Called when game scene is created. */
export function createCorals(scene) {
    scene.corals = [];
  resetCoralTypes(); // a previous game (e.g. before Return to Title) may have left the types stressed
  createCoralGroup(scene, 30); // create 30 corals
}

/* helper function to create a group of coral instances with random types and positions. */
function createCoralGroup(scene, count) {
  const types = Object.keys(coralTypes);

  for (let i = 0; i < count; i++) {
    const typeName = Phaser.Utils.Array.GetRandom(types);
    const type = coralTypes[typeName];

    let depth = Phaser.Math.Between(0, 2);

    const coral = scene.add
      .image(
        Phaser.Math.Between(0, scene.WORLD_WIDTH), // random x position
        scene.WORLD_HEIGHT - depthLevels[depth], // y position based on depth level
        type.key,
      )
      .setOrigin(0.5, 1)
      .setDepth(7-depth);
    
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

    coral.bleachRate = type.bleachRate;
    coral.stress = 0;
    coral.bleachStage = 0;

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
      coral.clearTint();

      if (coral.coralPulse) {
        coral.coralPulse.stop();
        coral.coralPulse = null;
      }
      coral.setScale(coral.baseScale); // stopping the pulse mid-way leaves the coral at whatever size it had reached
    });

    coral.on('pointerdown', () => { // on click: send coral info to React frontend for info popup
      if(scene.bubbleCollision || !scene.tutorialComplete || scene.simEnd){return}

      scene.coralInfoOpen = true;
      scene.score += 10;
      scene.emitStats();

      const plusText = scene.add.text(coral.x, coral.y - coral.height * 0.5, '+10', {
        fontSize: '28px',
        fontFamily: 'Poppins, sans-serif',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#005566',
        strokeThickness: 4
      }).setOrigin(0.5, 1).setDepth(20);

      scene.tweens.add({
        targets: plusText,
        y: plusText.y - 60,
        alpha: 0,
        duration: 900,
        ease: 'Cubic.out',
        onComplete: () => plusText.destroy()
      });

      scene.game.events.emit('coralInfo', {
        name: type.name,
        scientificName: type.scientificName,
        status: type.status,
        info: type.info,
        img: type.img
      });
    });

    scene.corals.push(coral);
    coralSway(scene, coral);
  }
}

/* animate corals */
function coralSway(scene, coral) {
    scene.tweens.add({
    targets: coral,
    angle: { from: -4, to: 4 },
    duration: Phaser.Math.Between(2500, 4000),
    yoyo: true,
    repeat: -1,
    ease: 'sine.inOut'
  });
}

function createBleachStages(scene, coralType) {
  const source = scene.textures.get(coralType).getSourceImage();
  const strengths = [0.2, 0.4, 0.65, 1.0]; // bleaching strengths for each stage
  const keys = [coralType];

  strengths.forEach((strength, index) => {
    const key = `${coralType}-bleach-${index + 1}`;

    if (!scene.textures.exists(key)) {
      const texture = scene.textures.createCanvas(key, source.width, source.height);
      const context = texture.getContext();
      context.drawImage(source, 0, 0);

      const image = context.getImageData(0, 0, source.width, source.height);
      const pixels = image.data;

      for (let i = 0; i < pixels.length; i += 4) {
        const red = pixels[i];
        const green = pixels[i + 1];
        const blue = pixels[i + 2];
        const gray = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

        for (let channel = 0; channel < 3; channel++) {
          const original = pixels[i + channel];
          const desaturated = gray + (original - gray) * (1 - strength);
          pixels[i + channel] = Math.round(
            desaturated + (255 - desaturated) * strength * 0.45
          );
        }
      }

      context.putImageData(image, 0, 0);
      texture.refresh();
    }

    keys.push(key);
  });

  return keys;
}
  

/* called when stress levels are updated in the game. stressAmount: 0-100 */
export function updateCoralStress(scene, stressAmount) {
  const adjustedStress = Math.floor((stressAmount / 100) * 4); // map stress 0-100 to 0-4 (number of spritesheet frames for corals)

  Object.values(coralTypes).forEach(type => {
    if (type.status !== 'Dead') {
      type.status = coralStatuses[adjustedStress];
      if (type.imgType === 'branch') {
        type.img = coralImgPathsBranch[adjustedStress];
      } else {
        type.img = coralImgPathsTabular[adjustedStress];
      }
    }
  });

  scene.corals.forEach(coral => {
  const type = coralTypes[coral.type];

  if (type.generatedStages) {
    coral.setTexture(type.generatedStages[adjustedStress]);
  } else {
    coral.setFrame(type.status === "Dead" ? 4 : adjustedStress);
  }
});
}

/* helper function to reset coral states. Called when game is reset. */
export function resetCorals(scene) {
  scene.corals.forEach(coral => {
    coral.stress = 0;
    coral.bleachStage = 0;
    const type = coralTypes[coral.type];

    if (type.generatedStages) {
      coral.setTexture(type.generatedStages[0]);
    } else {
      coral.setFrame(0);
    }
  });

  resetCoralTypes();
}

/* helper function to put every coral type's popup info back to Healthy.
   coralTypes is shared by every game, so a new game has to reset it too, not only a restart. */
function resetCoralTypes() {
  Object.values(coralTypes).forEach(type => {
    type.status = 'Healthy';
    if (type.imgType === 'branch') {
      type.img = coralImgPathsBranch[0];
    } else {
      type.img = coralImgPathsTabular[0];
    }
  });
}