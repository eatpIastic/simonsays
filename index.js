/// <reference types="../CTAutocomplete" />

import { registerWhen } from "../BloomCore/utils/Utils"
import RenderLib from "../RenderLib"

const TileEntitySign = Java.type("net.minecraft.tileentity.TileEntitySign");
const BlockSign = Java.type("net.minecraft.block.BlockSign");

let startButton = null;

let i = 0;
let timer = 0;
let onPhase = -1;
let locations = null;
let pattern = [];
let currentPattern = [];
let itsHappening = false;
let buttonLocation = -1;
let pb = -1;

const BUTTONWIDTH = 0.4
const BUTTONHEIGHT = 0.26
registerWhen(register("renderWorld", () => {
    if(itsHappening) renderBackground();
    const b = [...currentPattern]
    for (let i = 0; i < b.length; i++) {
        let [x, y, z] = b[i].split(",").map(a => parseInt(a))
        let color = [0, 1, 0]
        if (i == 1) color = [1, 1, 0]
        else if (i > 1) color = [1, 0, 0]

        if (Config.simonSolverStyle == 0) RenderLib.drawInnerEspBox(x+0.29, y+0.2, z+0.5, 0.6, 0.6, ...color, 0.7, false)
        else RenderLib.drawInnerEspBox(x-0.5, y+0.5-BUTTONHEIGHT/2+0.001, z+0.05, BUTTONWIDTH, BUTTONHEIGHT, ...color, 0.7, false)
    }
}), () => currentPattern.length);

function renderBackground() {
  let direction = getDirection(startButton);

  let blockStr = currentPattern[i-1]
  let [x, y, z] = blockStr.split(",")

  switch(direction) {
    case 'east':
      x = parseFloat(x) - 0.5
      z = parseFloat(z) - 0.4
      break;
    case 'west':
      x = parseFloat(x) - 0.5
      z = parseFloat(z) + 0.4
      break;
    case 'north':
      z = parseFloat(z) + 0.5
      x = parseFloat(x) - 0.4
      break;
    case 'south':
      z = parseFloat(z) + 0.5
      x = parseFloat(x) + 0.4
      break;
  }

  

  RenderLib.drawInnerEspBox(x, y, z, 1, 1, 0, .5, .5, .75, 0);
}


register("playerInteract", (action, pos) => {
  if(action.toString() !== "RIGHT_CLICK_BLOCK") return;
  if(itsHappening) return;
  let [x, y, z] = [pos.getX(), pos.getY(), pos.getZ()]
  // if it's the start button

  let adjacentPositions = [
    new BlockPos(x+1, y, z),
    new BlockPos(x, y, z+1),
    new BlockPos(x-1, y, z),
    new BlockPos(x, y, z-1)
  ]

  const adjacentSigns = adjacentPositions.map(a => World.getBlockAt(a)).filter(block => block.type.getID() === 68);

  // HACK: This is a hack to verify the SS is real
  if (adjacentSigns.length) {
    let isSSValid = false;
    for(const sign of adjacentSigns) {
       const tile = World.getAllTileEntitiesOfType(TileEntitySign.class).find(tile => tile.getBlockPos().equals(sign.getPos()));
        if (!tile) continue;
        const lines = tile.tileEntity.field_145915_a;
        if (!lines) continue;
        if(lines[0].func_150260_c() == "EatPlastic Simons" && lines[2].func_150260_c() == "sponsored by con") {
          isSSValid = true;
          break;
        }
    }
    
    if (!isSSValid) return;
    startButton = [x, y, z]
    reset();
    initSS();
    return;
  }

  // if its not the guy
  if(onPhase<0 || !pattern.length || timer == 0 || i<onPhase) return;

  let isButton = World.getBlockAt(x, y, z).type.getID() == 77
  if (!isButton) return

  
  let buttonPos = [x, y, z];
  
  switch (getDirection(startButton)) {
    case 'north':
      buttonPos = [x, y, z - 1]; 
      break;
    case 'south':
      buttonPos = [x, y, z + 1];
      break;
    case 'east':
      buttonPos = [x + 1, y, z];
      break;
    case 'west':
      buttonPos = [x - 1, y, z];
      break;
    default:
      ChatLib.chat("&cFailed to get direction");
      throw new Error("Failed to get direction");
  }
  

  if(currentPattern[0] != buttonPos.join(",")) {
    return;
    // ChatLib.chat("You Failed!");
    // return reset();
  }

  World.playSound("note.pling", 1, 2);
  currentPattern = currentPattern.splice(1);

  if(onPhase==4 && !currentPattern.length) {
    let completedIn = ((Date.now()-timer)/1000).toFixed(2);
    if(completedIn < pb || pb <= 0) pb = completedIn;
    ChatLib.chat(`SS Completed in ${completedIn} &7(${pb})`);
    reset();
    return;
  }

  if(!currentPattern.length) {
    onPhase += 1;
    runPhase();
  }
})

function initSS() {
  timer = Date.now();
  onPhase = 1;
  locations = getLocations();
  pattern = shuffle(locations);
  runPhase();
}

function runPhase() {
  i = 0;
  itsHappening = true;
  for(let idx = 0; idx <= onPhase+1; idx++) {
    setTimeout( () => {
      if(i>onPhase) {
        itsHappening = false
        return;
      }
      currentPattern.push(pattern[i]);
      i++;
    }, 500 * idx);
  }
}

/* HACK ! */

function getDirection(buttonLocation) {
  buttonLocation = new BlockPos(buttonLocation[0], buttonLocation[1], buttonLocation[2])
  let adjacentPositions = {
    east: new BlockPos(buttonLocation.getX()+1, buttonLocation.getY(), buttonLocation.getZ()) /* +X (East) */, 
    south: new BlockPos(buttonLocation.getX(), buttonLocation.getY(), buttonLocation.getZ()+1) /* +Z (South) */,
    west: new BlockPos(buttonLocation.getX()-1, buttonLocation.getY(), buttonLocation.getZ()) /* -X (West) */,
    north: new BlockPos(buttonLocation.getX(), buttonLocation.getY(), buttonLocation.getZ()-1) /* -Z (North) */,
  }

  let guy = null;

  Object.keys(adjacentPositions).forEach(key => {
    let block = World.getBlockAt(adjacentPositions[key])
    if(block.type.getID() == 77) return guy = key;
  });

  return guy;
}

function getLocations() {
  // -16 4 -26 -> -17 4 -25
  let [x0, y0, z0] = startButton;
  y0 -= 1

  let buttons = [];

  let direction = getDirection(startButton);

  if(!direction) {
    ChatLib.chat("&cFailed to get direction");
    throw new Error("Failed to get direction");
  }

  switch(direction) {
    case 'north':
      z0 -= 2; 
      break;
    case 'south':
      z0 += 2;
      break;
    case 'east':
      x0 += 2;
      break;
    case 'west':
      x0 -= 2;
      break;
  }



  for (let dy = 0; dy <= 3; dy++) {
    for (let dz = 0; dz <= 3; dz++) {
      let x, y, z;
      switch (direction) {
        case 'north':
          [x, y, z] = [x0, y0 + dy, z0 - dz];
          break;
        case 'south':
          [x, y, z]= [x0, y0 + dy, z0 + dz];
          break;
        case 'east':
          [x, y, z] = [x0 + dz, y0 + dy, z0];
          break;
        case 'west':
          [x, y, z] = [x0 - dz, y0 + dy, z0];
          break;
        default:
          ChatLib.chat("&cFailed to get direction");
          throw new Error("Failed to get direction");
      } 
      let str = [x, y, z].join(",");
      buttons.push(str);
    }
  }
  return buttons;
}

function shuffle(bigarray) {
  let array = [...bigarray]
  let currentIndex = array.length;
  while (currentIndex != 0) {
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

function reset() {
  i = 0;
  timer = 0
  onPhase = -1;
  pattern = [];
  currentPattern = [];
}
