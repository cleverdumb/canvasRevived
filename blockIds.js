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
    SMELTER: 19,
    STONEWALL: 20,
    TOMATO1: 21,
    TOMATO2: 22,
    TOMATO3: 23,
    WHEAT1: 24,
    WHEAT2: 25,
    WHEAT3: 26,
    WHEAT4: 27,
    CARROT1: 28,
    CARROT2: 29
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
    19: [208, 992],
    20: [288, 0],
    21: [0, 512],
    22: [16, 512],
    23: [32, 512],
    24: [256, 448],
    25: [240, 448],
    26: [224, 448],
    27: [272, 448],
    28: [0, 528],
    29: [304, 512]
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
    IRONBAR: 11,
    TOMATOSEED: 12,
    TOMATO: 13,
    WATERBUCKET: 14,
    WHEATSEED: 15,
    WHEAT: 16,
    CARROTSEED: 17,
    CARROT: 18,
    BOW: 19,
    WOODARROW: 20,
    COPPERARROW: 21
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
    11: [272, 0],
    12: [192, 512],
    13: [48, 512],
    14: [304, 32],
    15: [288, 448],
    16: [240, 432],
    17: [16, 528],
    18: [288, 512],
    19: [32, 240],
    20: [48, 240],
    21: [0, 960]
}

const toolSprPos = {
    6: [[256, 192], [16, 192]],
    7: [[272, 192], [0, 192]],
    8: [[224, 192], [48, 192]],
    9: [[240, 192], [32, 192]],
    10: [[208, 192], [64, 192]],
    19: [[144, 240], [128, 240]]
}

const unstack = [
    6, 7, 8, 9, 10, 19
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

const arrow = [
    20, 21
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
    10: 500,
    19: 400
}

const toolMaxDura = {
    6: 10,
    7: 10,
    8: 100,
    9: 100,
    10: 10,
    19: 100
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

const interactable = [B.TREE, B.TREE1, B.TREE2, B.TREE3, B.STONE, B.STONE1, B.STONE2, B.STONE3, B.IRON, B.IRON1, B.IRON2, B.IRON3, B.TOMATO2, B.TOMATO3,
B.WHEAT2, B.WHEAT3, B.WHEAT4, B.CARROT2];
const passable = [B.STUMP, B.STONEBASE, B.IRONBASE, B.SMELTER, B.TOMATO1, B.TOMATO2, B.TOMATO3, B.WHEAT1, B.WHEAT2, B.WHEAT3, B.WHEAT4, B.CARROT1, B.CARROT2];

const usable = [I.APPLE, I.TOMATOSEED, I.WATERBUCKET, I.WHEATSEED, I.CARROTSEED];

const nonFallThrough = [];

const placeable = ['WOODWALL', 'STONEWALL'];
module.exports = {
    B, I, baseRecipes, axe, pickaxe, unstack, requireAxe, requirePickaxe, toolCd, sword, dmg, interactable, passable, smelterRecipes, usable, nonFallThrough, placeable, passable, interactable, toolMaxDura, arrow
};
