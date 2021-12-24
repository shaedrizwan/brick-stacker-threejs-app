import * as THREE from 'three'
import CANNON from 'cannon'

export function generateBox(x, y, z, width, depth, falls,scene,world,stack) {

    const textureLoader = new THREE.TextureLoader()
    const legoTexture = textureLoader.load('./BrickMap.png')
    // ThreeJS
    const geometry = new THREE.BoxGeometry(width, 1, depth);
    const color = new THREE.Color(`hsl(${150 + stack.length * 4}, 100%, 50%)`);
    const material = new THREE.MeshStandardMaterial({ color });
    material.normalMap = legoTexture;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    scene.add(mesh);
  
    // CannonJS
    const shape = new CANNON.Box(
      new CANNON.Vec3(width / 2, 1 / 2, depth / 2)
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