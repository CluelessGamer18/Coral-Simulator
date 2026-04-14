/*  
Metadata for each coral type. 
    Append by adding new coral objects here, 
    and make sure to add corresponding images 
    in the assets folder and load them in 
    Preloader.js

    Any corals added here will be randomly generated in the scene, and will be affected by stress updates.
*/

var coralTypes = { 
  acropora: {
    key: 'acropora',
    name: 'Acropora',
    scientificName: '',
    status: 'Healthy',
    info: 'Acropora are among the fastest-growing corals, shaping diverse habitats with their antler-like branches. Although they support thousands of species, they are highly sensitive to bleaching and other impacts of climate change. ',
    imgType: 'tabular', // determines which set of bleach stage images to use for this coral type (tabular vs branch)
    img: 'healthy_tabular_microscope.png',
    bleachRate: 80
  },
  acropora1: {
    key: 'acropora1',
    name: 'Lattice Table Coral',
    scientificName: 'Acropora Clathrata',
    status: 'Healthy',
    info: 'Acropora Clathrata (known as Table Coral), forms wide, flat plates that provide massive shade and shelter for reef fish. It is a fast-growing, essential architect of dynamic reef ecosystems.',
    imgType: 'tabular',
    img: 'healthy_tabular_microscope.png',
    bleachRate: 100
  },
  acropora2: {
    key: 'acropora2',
    name: 'Lattice Table Coral',
    scientificName: 'Acropora Clathrata',
    status: 'Healthy',
    info: 'Acropora Clathrata (known as Table Coral), forms wide, flat plates that provide massive shade and shelter for reef fish. It is a fast-growing, essential architect of dynamic reef ecosystems.',
    imgType: 'tabular',
    img: 'healthy_tabular_microscope.png',
    bleachRate: 100
  },
  acropora3: {
    key: 'acropora3',
    name: 'Lattice Table Coral',
    scientificName: 'Acropora Clathrata',
    status: 'Healthy',
    info: 'Acropora Clathrata (known as Table Coral), forms wide, flat plates that provide massive shade and shelter for reef fish. It is a fast-growing, essential architect of dynamic reef ecosystems.',
    imgType: 'tabular',
    img: 'healthy_tabular_microscope.png',
    bleachRate: 100
  },
  montipora: {
    key: 'montipora',
    name: 'Finger Coral',
    scientificName: 'Montipora Digitata',
    status: 'Healthy',
    info: 'Montipora Digitata is a resilient, fast-growing coral with velvety, textured branches. Popular in natural reefs and home aquariums, it provides essential habitat while tolerating more environmental stress than its Acropora relatives. ',
    imgType: 'branch',
    img: 'healthy_microscope.png',
    bleachRate: 100
  },
  staghorn1: {
    key: 'staghorn1',
    name: 'Staghorn',
    scientificName: 'Acropora Cervicornis',
    status: 'Healthy',
    info: 'Staghorn coral, which resembles a set of deer antlers, is a fast-growing Caribbean species and a reef-building powerhouse. Although it has lost 97% of its population to disease and climate change, urgent restoration efforts are now helping it bounce back. ',
    imgType: 'branch',
    img: 'healthy_microscope.png',
    bleachRate: 100
  },
  staghorn2: {
    key: 'staghorn2',
    name: 'Staghorn',
    scientificName: 'Acropora Cervicornis',
    status: 'Healthy',
    info: 'Staghorn coral, which resembles a set of deer antlers, is a fast-growing Caribbean species and a reef-building powerhouse. Although it has lost 97% of its population to disease and climate change, urgent restoration efforts are now helping it bounce back. ',
    imgType: 'branch',
    img: 'healthy_microscope.png',
    bleachRate: 100
  }
};

const coralStatuses = ['Healthy', 'Ok', 'Stressed', 'Bleached', 'Dead']; // forwarded to React frontend for display

const coralImgPathsTabular = [ // microscope images of tabular coral bleach stages (for sending to React frontend)
  'healthy_tabular_microscope.png',
  'ok_tabular_microscope.png',
  'stressed_tabular_microscope.png',
  'bleached_tabular_microscope.png',
  'dead_tabular_microscope.png'
];

const coralImgPathsBranch = [ // microscope images of branch coral bleach stages (for sending to React frontend)
  'healthy_microscope.png',
  'ok_microscope.png',
  'stressed_microscope.png',
  'bleached_microscope.png',
  'dead_microscope.png'
];

// z levels for corals, which determine their y position and rendering depth in the scene
const depthLevels = [-10, 120, 180];


/* main function to create coral instances in the scene. Called when game scene is created. */
export function createCorals(scene) {
    scene.corals = [];
    const group = createCoralGroup(scene, 30); // create 30 corals
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

    coral.setInteractive(); // corals are clickable
    coral.type = typeName;
    coral.bleachRate = type.bleachRate;
    coral.stress = 0;
    coral.bleachStage = 0;

    coral.on('pointerover', () => { // hover effect
      coral.setTint(0xffcc88);

      coral.coralPulse = scene.tweens.add({
        targets: coral,
        scale: { from: 1, to: 1.05 },
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      });
    });

    
    coral.on('pointerout', () => { // end hover effect
      coral.setTint(0xFFFFFF);

      if (coral.coralPulse) {
        coral.coralPulse.stop();
      }
    });

    coral.on('pointerdown', () => { // on click: send coral info to React frontend for info popup
      if(scene.bubbleCollision || !scene.tutorialComplete){return}
      // console.log({
      //   type: coral.type,
      //   bleachRate: coral.bleachRate,
      //   stress: coral.stress,
      //   stage: coral.bleachStage
      // });

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
    if (coralTypes[coral.type].status !== 'Dead') {
      coral.setFrame(adjustedStress);
    } else {
      coral.setFrame(4);
    }
  });
}

/* helper function to reset coral states. Called when game is reset. */
export function resetCorals(scene) {
  scene.corals.forEach(coral => {
    coral.stress = 0;
    coral.bleachStage = 0;
    coral.setFrame(0);
  });

  Object.values(coralTypes).forEach(type => {
    type.status = 'Healthy';
    if (type.imgType === 'branch') {
      type.img = coralImgPathsBranch[0];
    } else {
      type.img = coralImgPathsTabular[0];
    }
  });
}   