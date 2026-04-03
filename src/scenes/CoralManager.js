var coralTypes = {
  acropora: {
    key: 'acropora',
    name: 'Acropora',
    scientificName: '',
    status: 'Healthy',
    info: 'Acropora are among the fastest-growing corals, shaping diverse habitats with their antler-like branches. Although they support thousands of species, they are highly sensitive to bleaching and other impacts of climate change. ',
    imgType: 'tabular',
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

const coralStatuses = ['Healthy', 'Ok', 'Stressed', 'Bleached', 'Dead'];

const coralImgPathsTabular = [
  'healthy_tabular_microscope.png',
  'ok_tabular_microscope.png',
  'stressed_tabular_microscope.png',
  'bleached_tabular_microscope.png',
  'dead_tabular_microscope.png'
];

const coralImgPathsBranch = [
  'healthy_microscope.png',
  'ok_microscope.png',
  'stressed_microscope.png',
  'bleached_microscope.png',
  'dead_microscope.png'
];

const depthLevels = [-10, 120, 180];


export function createCorals(scene) {

    scene.corals = [];

    const group = createCoralGroup(scene, 30);
    

}

function createCoralGroup(scene, count) {

  // const container = scene.add.container(0, 0);
  // container.setDepth(7);

  const types = Object.keys(coralTypes);

  for (let i = 0; i < count; i++) {

    const typeName = Phaser.Utils.Array.GetRandom(types);
    const type = coralTypes[typeName];

    let depth = Phaser.Math.Between(0, 2);

    const coral = scene.add
      .image(
        Phaser.Math.Between(0, scene.WORLD_WIDTH),
        scene.WORLD_HEIGHT - depthLevels[depth],
        type.key,
      )
      .setOrigin(0.5, 1)
      .setDepth(7-depth);

    coral.setInteractive();

    // metadata
    coral.type = typeName;
    coral.bleachRate = type.bleachRate;
    coral.stress = 0;
    coral.bleachStage = 0;

    coral.on('pointerover', () => {

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

    

    coral.on('pointerout', () => {

      coral.setTint(0xFFFFFF);

      if (coral.coralPulse) {
        coral.coralPulse.stop();
      }

    });

    coral.on('pointerdown', () => {
      if(scene.bubbleCollision || !scene.tutorialComplete){return}
      console.log({
        type: coral.type,
        bleachRate: coral.bleachRate,
        stress: coral.stress,
        stage: coral.bleachStage
      });

      scene.game.events.emit('coralInfo', {
        name: type.name,
        scientificName: type.scientificName,
        status: type.status,
        info: type.info,
        img: type.img
      });

    });

    // container.add(coral);
    scene.corals.push(coral);

    coralSway(scene, coral);
  }

  // return container;
}

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

export function updateCoralStress(scene, stressAmount) {
  const adjustedStress = Math.floor((stressAmount / 100) * 4); // map stress 0-100 to 0-4
  //update all coralTypes
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
    }
  });
}


export function resetCorals(scene) {
  scene.corals.forEach(coral => {
    coral.stress = 0;
    coral.bleachStage = 0;
    coral.setFrame(0);
  });

  //reset coralTypes
  Object.values(coralTypes).forEach(type => {
    type.status = 'Healthy';
    if (type.imgType === 'branch') {
      type.img = coralImgPathsBranch[0];
    } else {
      type.img = coralImgPathsTabular[0];
    }
  });
}   