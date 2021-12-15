import './style.css'
import * as THREE from 'three'
import CANNON from 'cannon'

window.focus()

// Initialize variables
let camera, scene, renderer;
let world;
let lastTime;
let stack;
let overhangs;
const boxHeight = 1;
const originalBoxSize = 3;
let gameStarted;
let gameEnded;

const scoreElement = document.getElementById("score");
const finalScoreElement = document.getElementById("final-score")
const instructionsElement = document.getElementById("instructions");
const resultsElement = document.getElementById("results");
const canvas = document.getElementById('webgl');

const textureLoader = new THREE.TextureLoader()
const legoTexture = textureLoader.load('./BrickMap.png')

init();

function init() {
  gameStarted = false;
  gameEnded = true;
  lastTime = 0;
  stack = [];
  overhangs = [];

  // Initialize CannonJS
  world = new CANNON.World();
  world.gravity.set(0, -10, 0);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 40;

  // Initialize ThreeJs
  const aspect = window.innerWidth / window.innerHeight;
  const width = 10;
  const height = width / aspect;
  
  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x87ceeb );

  
  // Initial Camera
  camera = new THREE.PerspectiveCamera(85,aspect,1,200);
  camera.position.set(4, 4, 4);
  camera.lookAt(0, 0, 0);


  //Inital Steady Bricks
  addLayer(0, 0, originalBoxSize, originalBoxSize);
  addLayer(-2, 0, originalBoxSize, originalBoxSize);
  addLayer(-2, -2, originalBoxSize, originalBoxSize);

  // Set up lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(10, 20, 0);
  scene.add(dirLight);

  // Set up renderer
  renderer = new THREE.WebGLRenderer({ canvas:canvas,antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animation);
}


window.addEventListener("mousedown", eventHandler);
window.addEventListener("touchstart", eventHandler);
window.addEventListener("keydown", function (event) {
  if (event.key == " ") {
    event.preventDefault();
    if(gameEnded){
      startGame()
    }else{
      eventHandler();
    }
    return;
  }
  if (event.key == "R" || event.key == "r") {
    event.preventDefault();
    startGame();
    return;
  }
});

function eventHandler() {
  if (!gameStarted) startGame();
  else splitBlockAndAddNextOneIfOverlaps();
}



function startGame() {
  gameStarted = true;
  gameEnded = false;
  lastTime = 0;
  stack = [];
  overhangs = [];

  if (instructionsElement) instructionsElement.style.display = "none";
  if (resultsElement) resultsElement.style.display = "none";
  if (scoreElement) scoreElement.innerText = 0;
  
  // Remove every object from world
  if (world) {
    while (world.bodies.length > 0) {
      world.remove(world.bodies[0]);
    }
  }

  // Remove every Bricks from the Scene
  if (scene) {
    while (scene.children.find((c) => c.type == "Mesh")) {
      const mesh = scene.children.find((c) => c.type == "Mesh");
      scene.remove(mesh);
    }

    // Foundation Brick
    addLayer(0, 0, originalBoxSize, originalBoxSize);

    // First Brick
    addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");
  }

  // Ground Plane
  const groundGeometry = new THREE.BoxGeometry(100, 0.1, 100);
  const groundMaterial = new THREE.MeshStandardMaterial({ color:0xc68767 });
  const mesh = new THREE.Mesh(groundGeometry, groundMaterial);
  mesh.position.set(-2, -0.5, -2);
  scene.add(mesh);

  const shape = new CANNON.Box(
    new CANNON.Vec3(100,0.1,100)
  );
  let mass = 0;
  const body = new CANNON.Body({ mass, shape });
  body.position.set(-2,-0.5,-2);
  world.addBody(body);

  // Reset camera positions
  if (camera) {
    camera.position.set(4, 4, 4);
    camera.lookAt(0, 0, 0);
  }
}

function addLayer(x, z, width, depth, direction) {
  const y = boxHeight * stack.length; // Add the new box one layer higher
  const layer = generateBox(x, y, z, width, depth, false);
  layer.direction = direction;
  stack.push(layer);
}


function generateBox(x, y, z, width, depth, falls) {
  // ThreeJS
  const geometry = new THREE.BoxGeometry(width, boxHeight, depth);
  const color = new THREE.Color(`hsl(${150 + stack.length * 4}, 100%, 50%)`);
  const material = new THREE.MeshStandardMaterial({ color });
  material.normalMap = legoTexture;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  scene.add(mesh);

  // CannonJS
  const shape = new CANNON.Box(
    new CANNON.Vec3(width / 2, boxHeight / 2, depth / 2)
  );
  let mass = falls ? 5 : 0;
  const body = new CANNON.Body({ mass, shape });
  body.position.set(x, y, z);
  world.addBody(body);

  return {
    threejs: mesh,
    cannonjs: body,
    width,
    depth
  };
}


function splitBlockAndAddNextOneIfOverlaps() {
  if (gameEnded) return;

  const topLayer = stack[stack.length - 1];
  const previousLayer = stack[stack.length - 2];

  const direction = topLayer.direction;

  const size = direction == "x" ? topLayer.width : topLayer.depth;
  const delta =
    topLayer.threejs.position[direction] -
    previousLayer.threejs.position[direction];
  const overhangSize = Math.abs(delta);
  const overlap = size - overhangSize;

  if (overlap > 0) {
    cutBox(topLayer, overlap, size, delta);

    // Overhang
    const overhangShift = (overlap / 2 + overhangSize / 2) * Math.sign(delta);
    const overhangX =
      direction == "x"
        ? topLayer.threejs.position.x + overhangShift
        : topLayer.threejs.position.x;
    const overhangZ =
      direction == "z"
        ? topLayer.threejs.position.z + overhangShift
        : topLayer.threejs.position.z;
    const overhangWidth = direction == "x" ? overhangSize : topLayer.width;
    const overhangDepth = direction == "z" ? overhangSize : topLayer.depth;

    addOverhang(overhangX, overhangZ, overhangWidth, overhangDepth);

    // Next Brick attributes
    const nextX = direction == "x" ? topLayer.threejs.position.x : -10;
    const nextZ = direction == "z" ? topLayer.threejs.position.z : -10;
    console.log("topLayer.threejs.position.x: ",topLayer.threejs.position.x)
    console.log("topLayer.threejs.position.z: ",topLayer.threejs.position.z)
    const newWidth = topLayer.width;
    const newDepth = topLayer.depth;
    const nextDirection = direction == "x" ? "z" : "x";

    if (scoreElement) scoreElement.innerText = stack.length - 1;
    addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);
  } else {
    finalScoreElement.innerText = stack.length - 2;
    missedTheSpot();
  }
}

function cutBox(topLayer, overlap, size, delta) {
  const direction = topLayer.direction;
  const newWidth = direction == "x" ? overlap : topLayer.width;
  const newDepth = direction == "z" ? overlap : topLayer.depth;

  // Update metadata
  topLayer.width = newWidth;
  topLayer.depth = newDepth;

  // Update ThreeJS model
  topLayer.threejs.scale[direction] = overlap / size;
  topLayer.threejs.position[direction] -= delta / 2;

  // Update CannonJS model
  topLayer.cannonjs.position[direction] -= delta / 2;

  // Replace shape to a smaller one (in CannonJS you can't simply just scale a shape)
  const shape = new CANNON.Box(
    new CANNON.Vec3(newWidth / 2, boxHeight / 2, newDepth / 2)
  );
  topLayer.cannonjs.shapes = [];
  topLayer.cannonjs.addShape(shape);
}

function addOverhang(x, z, width, depth) {
  const y = boxHeight * (stack.length - 1); // Add the new box one the same layer
  const overhang = generateBox(x, y, z, width, depth, true);
  overhangs.push(overhang);
}


function missedTheSpot() {
  const topLayer = stack[stack.length - 1];

  // Turn to top layer into an overhang and let it fall down
  addOverhang(
    topLayer.threejs.position.x,
    topLayer.threejs.position.z,
    topLayer.width,
    topLayer.depth
  );
  world.remove(topLayer.cannonjs);
  scene.remove(topLayer.threejs);

  gameEnded = true;
  if (resultsElement) resultsElement.style.display = "flex";
}

function animation(time) {
  if (lastTime) {
    const timePassed = time - lastTime;
    const speed = 0.008;

    const topLayer = stack[stack.length - 1];

    // Brick movement
    if (!gameEnded) {
      topLayer.threejs.position[topLayer.direction] += speed * timePassed;
      topLayer.cannonjs.position[topLayer.direction] += speed * timePassed;

      if (topLayer.threejs.position[topLayer.direction] > 10) {
        missedTheSpot();
      }
    } 

    // Increase camera height
    if (camera.position.y < boxHeight * (stack.length - 2) + 4) {
      camera.position.y += speed * timePassed;
    }

    updatePhysics(timePassed);
    renderer.render(scene, camera);
  }
  lastTime = time;
}

function updatePhysics(timePassed) {
  world.step(timePassed / 1000);

  // Copy coordinates from Cannon.js to Three.js
  overhangs.forEach((element) => {
    element.threejs.position.copy(element.cannonjs.position);
    element.threejs.quaternion.copy(element.cannonjs.quaternion);
  });
}
