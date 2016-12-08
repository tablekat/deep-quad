
import * as THREE from 'three';

const GRID_WIDTH = 40;
const GRID_HEIGHT = 40;
const GRID_SCALE = 25;

let ArrowGrid;

export function makeGrid(scene){
  let gridObj = new THREE.Object3D();

  ArrowGrid = new Array(GRID_HEIGHT);
  for(let i=0; i < GRID_HEIGHT; ++i){
    ArrowGrid[i] = new Array(GRID_WIDTH);
    for(let j = 0; j < GRID_WIDTH; ++j){
      let x = (j - GRID_WIDTH / 2) * GRID_SCALE;
      let y = (i - GRID_HEIGHT / 2) * GRID_SCALE;
      let arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(x, y, 0), 12, 0xaa00aa, 6, 8);
      ArrowGrid[i][j] = arrow;
      gridObj.add(arrow);
    }
  }

  scene.add(gridObj);
}


export function updateGrid(brain){
  brain.learning = false;

  for(let i=0; i < GRID_HEIGHT; ++i){
    for(let j = 0; j < GRID_WIDTH; ++j){
      let x = (j - GRID_WIDTH / 2) * GRID_SCALE;
      let y = (i - GRID_HEIGHT / 2) * GRID_SCALE;

      let actionId = brain.forward([x, y]);

      switch(actionId){
        case 0:
          ArrowGrid[i][j].setDirection(new THREE.Vector3(1, 0, 0));
          ArrowGrid[i][j].setColor(new THREE.Color(0xaa00aa));
          break;
        case 1:
          ArrowGrid[i][j].setDirection(new THREE.Vector3(-1, 0, 0));
          ArrowGrid[i][j].setColor(new THREE.Color(0xbb0044));
          break;
        case 2:
          ArrowGrid[i][j].setDirection(new THREE.Vector3(0, 1, 0));
          ArrowGrid[i][j].setColor(new THREE.Color(0x4400bb));
          break;
        case 3:
          ArrowGrid[i][j].setDirection(new THREE.Vector3(1, -1, 0));
          ArrowGrid[i][j].setColor(new THREE.Color(0xbb99bb));
          break;
      }
    }
  }

  brain.learning = true;
}
