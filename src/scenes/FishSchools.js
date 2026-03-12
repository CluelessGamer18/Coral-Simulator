let numOfSchools = 15;
let schoolChance = 50; // 70% chance a school will have more than 1 fish
let maxSchoolSize = 15;

let maxFishScale = 0.5;
let minFishScale = 0.3;


export function createFishSchools(scene) {
  for (let i = 0; i < numOfSchools; i++) {

    let numFish = 1;

    if (Phaser.Math.Between(0, 100) > (100 - schoolChance)) {
      numFish = Phaser.Math.Between(1, maxSchoolSize);
    }

    let type = Phaser.Math.Between(0, 7); // random fish type
    let depth = Phaser.Math.Between(0, 2);

    const school = createSchool(scene, numFish, type, depth);

    repeatMovement(scene, school);
  }
}

function createSchool(scene, count, type, depth) {

  const tints = [0x32AFAC, 0x143F45, null];

  const container = scene.add.container(
    Phaser.Math.Between(0, scene.WORLD_WIDTH),
    Phaser.Math.Between(0, scene.WORLD_HEIGHT)
  );

  container.setDepth(depth);


  for (let i = 0; i < count; i++) {
    let staticScale = Phaser.Math.FloatBetween(minFishScale, maxFishScale);
    const depthScale = [0.2, 0.5, 1.0];

    const fish = scene.add.image(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100), 'fishTypes', type).setScale(staticScale * depthScale[depth]);

      if (tints[depth]) {
      fish.setTintFill(tints[depth]);
    }
    container.add(fish);
  }

  return container;
}

function repeatMovement(scene, school) {

    // min and max ms between movements
  const minInterval = 5000;
  const maxInterval = 20000;

  const nextCall = Phaser.Math.Between(minInterval, maxInterval);

  // chooseNextPos(scene, school, nextCall);
  chooseNextPos(scene, school, nextCall);

  scene.time.delayedCall(nextCall, () => {
    repeatMovement(scene, school);
  });
}

function chooseNextPos(scene, school, duration) {

  // max distance a school can move in one tween
  const maxDistance = 2000;

  var newX = Phaser.Math.Between(0, scene.WORLD_WIDTH);
  var newY = Phaser.Math.Between(0, scene.WORLD_HEIGHT);

  while (Phaser.Math.Distance.Between(school.x, school.y, newX, newY) > maxDistance) {
    newX = Phaser.Math.Between(0, scene.WORLD_WIDTH);
    newY = Phaser.Math.Between(0, scene.WORLD_HEIGHT);
  }

  const isRight = newX > school.x;

  scene.tweens.add({
    targets: school,
    x: newX,
    y: newY,
    duration: duration,
    ease: "Sine.easeInOut"
  });

  school.iterate(child => {

    child.setFlipX(isRight);

    //varient position in school
    const offsetX = Phaser.Math.Between(-100, 100);
    const offsetY = Phaser.Math.Between(-100, 100);

    scene.tweens.add({
      targets: child,
      x: offsetX,
      y: offsetY,
      duration: duration
    });

  });
}
