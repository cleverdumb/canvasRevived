const B = {
    GRASS: 0,
    WATER: 1,
    TREE: 2,
    TREE1: 3,
    TREE2: 4,
    TREE3: 5,
    STUMP: 6,
    SAND: 7,
    WOODWALL: 8,
    STONE: 9,
    STONE1: 10,
    STONE2: 11,
    STONE3: 12,
    STONEBASE: 13,
    IRON: 14,
    IRON1: 15,
    IRON2: 16,
    IRON3: 17,
    IRONBASE: 18,
    SMELTER: 19
}

const sprPos = {
    0: [0, 0],
    1: [0, 64],
    2: [16, 0],
    3: [32, 0],
    4: [48, 0],
    5: [64, 0],
    6: [80, 0],
    7: [16, 64],
    8: [112, 0],
    9: [176, 0],
    10: [192, 0],
    11: [208, 0],
    12: [224, 0],
    13: [240, 0],
    14: [176, 0],
    15: [224, 992],
    16: [240, 992],
    17: [256, 992],
    18: [272, 992],
    19: [208, 992]
}

const iSprPos = {
    0: [96, 0],
    1: [304, 160],
    2: [256, 0],
    3: [160, 992],
    4: [112, 0],
    5: [288, 0],
    6: [32, 64],
    7: [64, 64],
    8: [48, 64],
    9: [80, 64],
    10: [160, 64],
    11: [272, 0]
}

const I = {
    WOOD: 0,
    APPLE: 1,
    STONE: 2,
    IRONORE: 3,
    WOODWALL: 4,
    STONEWALL: 5,
    WOODPICK: 6,
    WOODAXE: 7,
    STONEPICK: 8,
    STONEAXE: 9,
    WOODSWORD: 10,
    IRONBAR: 11
}

const toolSprPos = {
    6: [[256, 192], [16, 192]],
    7: [[272, 192], [0, 192]],
    8: [[224, 192], [48, 192]],
    9: [[240, 192], [32, 192]],
    10: [[208, 192], [64, 192]]
}

const unstack = [
    6, 7, 8, 9, 10
]

const axe = [
    7, 9
]

const pickaxe = [
    6, 8
]

const sword = [
    10
]

const requireAxe = [
    B.TREE, B.TREE1, B.TREE2, B.TREE3
]

const requirePickaxe = [
    B.STONE, B.STONE1, B.STONE2, B.STONE3,
    B.IRON, B.IRON1, B.IRON2, B.IRON3
]

const toolCd = {
    6: 500,
    7: 500,
    8: 250,
    9: 250,
    10: 500
}

const dmg = {
    10: 20
}

const baseRecipes = {
    STONEWALL: {STONE: 1},
    WOODWALL: {WOOD: 4}
}

const smelterRecipes = {
    IRONBAR: {IRONORE: 4} 
}

const interactable = [B.TREE, B.TREE1, B.TREE2, B.TREE3, B.STONE, B.STONE1, B.STONE2, B.STONE3, B.IRON, B.IRON1, B.IRON2, B.IRON3];
const passable = [B.GRASS, B.STUMP, B.STONEBASE, B.IRONBASE, B.SMELTER];

const usable = [I.APPLE];
module.exports = {
    B, I, baseRecipes, axe, pickaxe, unstack, requireAxe, requirePickaxe, toolCd, sword, dmg, interactable, passable, smelterRecipes, usable
};
