export function createCorals(scene) {

    scene.corals = [];

    const group = createCoralGroup(scene, 10);
    

}

function createCoralGroup(scene, count) {

  const container = scene.add.container(0, 0);
  container.setDepth(6);

  for (let i = 0; i < count; i++) {

    const coral = scene.add
      .image(Phaser.Math.Between(0, scene.WORLD_WIDTH), scene.WORLD_HEIGHT - 120, 'orangeCoral', 0)
      .setOrigin(0.5, 1);

      coral.setInteractive();

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

export function updateBleachStage(scene, stage) {

  scene.corals.forEach(coral => {
    coral.bleachStage = stage;
    coral.setFrame(stage);
  });

}


