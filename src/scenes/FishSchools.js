/* Fish school generation and movement logic 
    - Modify fish types by changing the fish spritesheet and adjusting fishTypes below (key corresponds to spritesheet frame)
*/

const fishTypes = {
  yellowTang: {
    key: 0, // spritesheet frame
    min: 3, // min and max number of fish randomly generated in a school of this type
    max: 5
  },
  moorishIdol: {
    key: 1,
    min: 2,
    max: 3
  },
  clownFish: {
    key: 2,
    min: 1,
    max: 3
  },
  frenchAngelFish: {
    key: 3,
    min: 2,
    max: 2
  },
  yellowLongNoseButterfly: {
    key: 4,
    min: 1,
    max: 3
  },
  regalTang: {
    key: 5,
    min: 8,
    max: 14
  },
  lionFish: {
    key: 6,
    min: 1,
    max: 2
  },
  baracuda: {
    key: 7,
    min: 1,
    max: 2
  },
  school: {
    key: 8,
    min: 6,
    max: 10
  },
  yellowBoxfish: {
    key: 9,
    min: 1,
    max: 1
  },
  commonTrout: {
    key: 10,
    min: 4,
    max: 6
  },
  jellyfish: {
    key: 11,
    min: 1,
    max: 2
  }

};

let numOfSchools = 25;
let schoolChance = 50; // 50% chance a school will have more than 1 fish

let maxFishScale = 0.5; // fish size variation
let minFishScale = 0.3;

let timeJump = 1;

// settings for 3 depth levels of fish, which affect their size, speed, and how far they move in the scene
const depthSettings = [ 
  { scale: 0.1, scroll: 1440, speed: 1.6, distance: 0.3, tint: 0x32AFAC}, // background
  { scale: 0.3, scroll: 2072, speed: 1.3, distance: 0.6, tint: 0x143F45}, // mid
  { scale: 0.85, scroll: 2860, speed: 1.0, distance: 1.0, tint: null}  // foreground
];

/* hypothetical settings for faster movement during time jumps (not curently implemented) */
export function timeJumpAnimate(speed) {
  timeJump = speed;
}

/* main function to create fish schools in the scene. Called when game scene is created. */
export function createFishSchools(scene) {
  for (let i = 0; i < numOfSchools; i++) {

    const types = Object.keys(fishTypes);

    const typeName = Phaser.Utils.Array.GetRandom(types); // random fish type
    const type = fishTypes[typeName];
    const depthWeights = [0,0,0,0,1, 1, 2,2,2]; // weighted random depth (more fish in foreground and background, fewer in midground)
    let depth = Phaser.Utils.Array.GetRandom(depthWeights);

    let numFish = 1;

    if (Phaser.Math.Between(0, 100) > (100 - schoolChance)) {
      numFish = Phaser.Math.Between(type.min, type.max);
    }

    const school = createSchool(scene, numFish, type, depth);

    repeatMovement(scene, school);
  }
}

/* helper function to create a school of fish as a container with multiple fish images. */
function createSchool(scene, count, type, depth) {

  const container = scene.add.container(
    Phaser.Math.Between(0, scene.WORLD_WIDTH),
    Phaser.Math.Between(0, scene.WORLD_HEIGHT)
  );

  container.depthLevel = depth;
  container.setDepth(depth).setScrollFactor((depthSettings[depth].scroll - 1440) / (scene.WORLD_WIDTH - 1440), 1); // parallax scrolling based on depth


  for (let i = 0; i < count; i++) {
    let staticScale = Phaser.Math.FloatBetween(minFishScale, maxFishScale);

    const fish = scene.add.image(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100), 'fishTypes', type.key).setScale(staticScale * depthSettings[depth].scale);

      if (depthSettings[depth].tint) {
      fish.setTintFill(depthSettings[depth].tint);
    }
    container.add(fish);
  }

  return container;
}

/* function to randomly move a school to a new position, loops. */
function repeatMovement(scene, school) {
  // min and max ms between movements
  const minInterval = 5000;
  const maxInterval = 20000;

  const nextCall = Phaser.Math.Between(minInterval * timeJump, maxInterval * timeJump);

  chooseNextPos(scene, school, nextCall);

  scene.time.delayedCall(nextCall, () => {
    repeatMovement(scene, school);
  });
}


/* helper function to choose a new random position for a school and tween it there. */
function chooseNextPos(scene, school, duration) {

  // max distance/speed a school can move in one tween
  const maxDistance = 2000 * depthSettings[school.depthLevel].distance;

  const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
  const distance = Phaser.Math.Between(200, maxDistance);

  let newX = school.x + Math.cos(angle) * distance;
  let newY = school.y + Math.sin(angle) * distance;

  newX = Phaser.Math.Clamp(newX, 0, depthSettings[school.depthLevel].scroll);
  newY = Phaser.Math.Clamp(newY, 0, scene.WORLD_HEIGHT - ((2-school.depthLevel)*100)-400);

  const isRight = newX > school.x;

  scene.tweens.add({
    targets: school,
    x: newX,
    y: newY,
    duration: duration * depthSettings[school.depthLevel].speed * timeJump,
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
      duration: duration * depthSettings[school.depthLevel].speed * timeJump
    });

  });
}