import './style.css'
import * as THREE from 'three'
import CANNON from 'cannon'
import {missedTheSpot} from './Components/missedTheSpot'
import { updatePhysics } from './Components/updatePhysics';
import { addOverhang } from './Components/addOverhang';
import { addLayer } from './Components/addLayer';
import { cutBox } from './Components/cutBox';


var camera, scene, renderer;
var world;
var stack = [];
var overhangs = [];
const boxHeight = 1;
const originalBoxSize = 3;
var gameStarted = false;
var gameEnded = true;

const scoreElement = document.getElementById("score");
const finalScoreElement = document.getElementById("final-score")
const instructionsElement = document.getElementById("instructions");
const resultsElement = document.getElementById("results");
const canvas = document.getElementById('game-canvas');


initializeGame();

function initializeGame() {
  gameStarted = false;
  gameEnded = true;
  stack = [];
  overhangs = [];
  
  const aspect = window.innerWidth / window.innerHeight;
  const width = 10;
  const height = width / aspect;
  
  // Initialize ThreeJS Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x87ceeb );

  // Initialize CannonJS
  world = new CANNON.World();
  world.gravity.set(0, -10, 0);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 40;

  
  // Initial Camera
  camera = new THREE.PerspectiveCamera(85,aspect,1,200);
  camera.position.set(4, 4, 4);
  camera.lookAt(0, 0, 0);


  //Inital Steady Bricks
  [scene,world,stack] =addLayer({x:0,z: 0,width:originalBoxSize,depth:originalBoxSize,boxHeight,scene,world,stack});
  [scene,world,stack] =addLayer({x:-2,z: 0,width:originalBoxSize,depth:originalBoxSize,boxHeight,scene,world,stack});
  [scene,world,stack] =addLayer({x:-2,z:-2,width:originalBoxSize,depth:originalBoxSize,boxHeight,scene,world,stack});

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


window.addEventListener("mousedown", clickEventHandler);
window.addEventListener("touchstart", clickEventHandler);
window.addEventListener("keydown", function (event) {
  if (event.key == " ") {
    event.preventDefault();
    if(gameEnded){
      startGame()
    }else{
      clickEventHandler();
    }
    return;
  }
  if (event.key == "R" || event.key == "r") {
    event.preventDefault();
    startGame();
    return;
  }
});

function clickEventHandler() {
  if (!gameStarted) startGame();
  else splitBlockAndAddNextOneIfOverlaps();
}



function startGame() {
  gameStarted = true;
  gameEnded = false;
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
    [scene,world,stack] =addLayer({x:0,z: 0,width:originalBoxSize,depth:originalBoxSize,boxHeight,scene,world,stack});

    // First Brick
    [scene,world,stack] =addLayer({x:-10,z: 0,width:originalBoxSize,depth:originalBoxSize,direction:"x",boxHeight,scene,world,stack});
  }

  // Ground Plane
  const groundGeometry = new THREE.BoxGeometry(100, 0.1, 100);
  const groundMaterial = new THREE.MeshStandardMaterial({ color:0xc68767 });
  const mesh = new THREE.Mesh(groundGeometry, groundMaterial);
  mesh.position.set(-2, -0.5, -2);
  scene.add(mesh);

  const shape = new CANNON.Box(
    new CANNON.Vec3(100/2,0.1/2,100/2)
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


function splitBlockAndAddNextOneIfOverlaps() {
  if (gameEnded) return;

  let topLayer = stack[stack.length - 1];
  let previousLayer = stack[stack.length - 2];

  const direction = topLayer.direction;

  const size = direction == "x" ? topLayer.width : topLayer.depth;
  const delta =
    topLayer.threejs.position[direction] -
    previousLayer.threejs.position[direction];
  const overhangSize = Math.abs(delta);
  const overlap = size - overhangSize;

  if (overlap > 0) {
    topLayer = cutBox(topLayer, overlap, size, delta);

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

    overhangs = addOverhang({x:overhangX, z:overhangZ, width:overhangWidth, depth:overhangDepth,boxHeight,stack,overhangs,scene,world});
    // Next Brick attributes
    const nextX = direction == "x" ? topLayer.threejs.position.x : -10;
    const nextZ = direction == "z" ? topLayer.threejs.position.z : -10;
    const newWidth = topLayer.width;
    const newDepth = topLayer.depth;
    const nextDirection = direction == "x" ? "z" : "x";

    if (scoreElement) scoreElement.innerText = stack.length - 1;
    [scene,world,stack] = addLayer({x:nextX, z:nextZ, width:newWidth, depth:newDepth, direction:nextDirection,boxHeight,scene,world,stack});
  } else {
    finalScoreElement.innerText = stack.length - 2;
    gameEnded = missedTheSpot({stack,world,scene,resultsElement});
  }
}


function animation() {
    const speed = 0.15;

    const topLayer = stack[stack.length - 1];

    // Brick movement
    if (!gameEnded) {
      topLayer.threejs.position[topLayer.direction] += speed;
      topLayer.cannonjs.position[topLayer.direction] += speed;

      if (topLayer.threejs.position[topLayer.direction] > 10) {
        gameEnded = missedTheSpot({stack,world,scene,resultsElement});
      }
    } 

    // Increase camera height
    if (camera.position.y < boxHeight * (stack.length - 2) + 4) {
      camera.position.y += speed;
    }

    [world,overhangs] = updatePhysics(world,overhangs);
    renderer.render(scene, camera);
  }
