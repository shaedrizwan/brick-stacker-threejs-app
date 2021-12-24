import { generateBox } from './generateBox';

export function addLayer({x, z, width, depth, direction,boxHeight,scene,world,stack}) {
    const y = boxHeight * stack.length;
    const layer = generateBox(x, y, z, width, depth, false,scene,world,stack);
    scene.add(layer.threejs)
    world.addBody(layer.cannonjs)
    layer.direction = direction;
    stack.push(layer);

    return [scene,world,stack]
  }