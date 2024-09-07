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
    IRONBASE: 18
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
    18: [272, 992]
}

const iSprPos = {
    0: [96, 0],
    1: [304, 160],
    2: [256, 0],
    3: [160, 992],
    4: [112, 0],
    5: [288, 0],
    6: [32, 64]
}

const I = {
    WOOD: 0,
    APPLE: 1,
    STONE: 2,
    IRONORE: 3,
    WOODWALL: 4,
    STONEWALL: 5,
    WOODPICK: 6
}

const unstack = [
    6
]

const R = {
    STONEWALL: {STONE: 1},
    WOODWALL: {WOOD: 4}
}