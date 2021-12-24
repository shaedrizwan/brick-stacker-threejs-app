export function missedTheSpot({stack,world,scene,gameEnded,resultsElement}) {
    const topLayer = stack[stack.length - 1];
  
    world.remove(topLayer.cannonjs);
    scene.remove(topLayer.threejs);
  
    gameEnded = true;
    if (resultsElement) resultsElement.style.display = "flex";

    return gameEnded
  }