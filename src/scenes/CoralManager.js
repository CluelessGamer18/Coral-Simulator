const coralTypes = { //examples **replace with actual spritesheets later**
  orange: {
    key: 'orangeCoral',
    bleachRate: 1.0
  },
  brain: {
    key: 'brainCoral',
    bleachRate: 0.6
  },
  staghorn: {
    key: 'staghornCoral',
    bleachRate: 1.4
  }
};



export function createCorals(scene) {

    scene.corals = [];

    const group = createCoralGroup(scene, 10);
    

}

function createCoralGroup(scene, count) {

  const container = scene.add.container(0, 0);
  container.setDepth(6);

  const types = Object.keys(coralTypes);

  for (let i = 0; i < count; i++) {

    const typeName = Phaser.Utils.Array.GetRandom(types);
    const type = coralTypes[typeName];

    const coral = scene.add
      .image(
        Phaser.Math.Between(0, scene.WORLD_WIDTH),
        scene.WORLD_HEIGHT - 120,
        type.key,
        0
      )
      .setOrigin(0.5, 1);

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

      coral.clearTint().setScale(1);

      if (coral.coralPulse) {
        coral.coralPulse.stop();
      }

    });

    coral.on('pointerdown', () => {

      console.log({
        type: coral.type,
        bleachRate: coral.bleachRate,
        stress: coral.stress,
        stage: coral.bleachStage
      });

    });

    coral.bleachStage = 1;

    container.add(coral);
    scene.corals.push(coral);

    coralSway(scene, coral);
  }

  return container;
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

  scene.corals.forEach(coral => {

    coral.stress = stressAmount;

    const bleachValue = coral.stress * coral.bleachRate;

    const stage = Phaser.Math.Clamp(
      Math.floor(bleachValue / 20),
      0,
      3
    );

    coral.bleachStage = stage;
    coral.setFrame(stage);

  });

}


