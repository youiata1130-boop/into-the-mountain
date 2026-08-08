(function () {
  var CATEGORY = {
    RESOURCE: "資源",
    TOOL: "道具",
    BUILDING: "建物",
    PERSONNEL: "人材",
    EVENT: "イベント"
  };

  var RESOURCE = {
    WOOD: "木",
    STONE: "石",
    IRON: "鉄"
  };

  var TOOL = {
    WOOD_AXE: "木の斧",
    WOOD_PICKAXE: "木のつるはし",
    STONE_PICKAXE: "石のつるはし",
    STONE_SWORD: "石の剣",
    IRON_SWORD: "鉄の剣"
  };

  var BUILDING = {
    WOOD_FENCE: "木の柵",
    CASTLE_WALL: "城壁",
    EVOLUTION_TEMPLE: "進化の神殿",
    VICTORY_TEMPLE: "勝利の神殿"
  };

  var PERSONNEL = {
    LUMBERJACK: "木こり",
    SWORDSMAN: "剣士",
    SAGE: "賢者"
  };

  var EVENT = {
    DISASTER: "災害"
  };

  var TOOL_ATTACK = {};
  TOOL_ATTACK[TOOL.STONE_SWORD] = 1;
  TOOL_ATTACK[TOOL.IRON_SWORD] = 3;

  var BUILDING_DEFENSE = {};
  BUILDING_DEFENSE[BUILDING.WOOD_FENCE] = 2;
  BUILDING_DEFENSE[BUILDING.CASTLE_WALL] = 4;

  var PERSONNEL_COST = {};
  PERSONNEL_COST[PERSONNEL.LUMBERJACK] = 2;
  PERSONNEL_COST[PERSONNEL.SWORDSMAN] = 4;
  PERSONNEL_COST[PERSONNEL.SAGE] = 6;

  var PERSONNEL_ATTACK = {};
  PERSONNEL_ATTACK[PERSONNEL.SWORDSMAN] = 4;

  var IMAGE_PATHS = {
    resources: {},
    tools: {},
    buildings: {},
    personnel: {},
    events: {}
  };

  IMAGE_PATHS.resources[RESOURCE.WOOD] = "assets/images/resources/wood.svg";
  IMAGE_PATHS.resources[RESOURCE.STONE] = "assets/images/resources/stone.svg";
  IMAGE_PATHS.resources[RESOURCE.IRON] = "assets/images/resources/iron.svg";

  IMAGE_PATHS.tools[TOOL.WOOD_AXE] = "assets/images/tools/wood-axe.svg";
  IMAGE_PATHS.tools[TOOL.WOOD_PICKAXE] = "assets/images/tools/wood-pickaxe.svg";
  IMAGE_PATHS.tools[TOOL.STONE_PICKAXE] = "assets/images/tools/stone-pickaxe.svg";
  IMAGE_PATHS.tools[TOOL.STONE_SWORD] = "assets/images/tools/stone-sword.svg";
  IMAGE_PATHS.tools[TOOL.IRON_SWORD] = "assets/images/tools/iron-sword.svg";

  IMAGE_PATHS.buildings[BUILDING.WOOD_FENCE] = "assets/images/buildings/wood-fence.svg";
  IMAGE_PATHS.buildings[BUILDING.CASTLE_WALL] = "assets/images/buildings/castle-wall.svg";
  IMAGE_PATHS.buildings[BUILDING.EVOLUTION_TEMPLE] = "assets/images/buildings/evolution-temple.svg";
  IMAGE_PATHS.buildings[BUILDING.VICTORY_TEMPLE] = "assets/images/buildings/victory-temple.svg";

  IMAGE_PATHS.personnel[PERSONNEL.LUMBERJACK] = "assets/images/personnel/lumberjack.svg";
  IMAGE_PATHS.personnel[PERSONNEL.SWORDSMAN] = "assets/images/personnel/swordsman.svg";
  IMAGE_PATHS.personnel[PERSONNEL.SAGE] = "assets/images/personnel/sage.svg";

  IMAGE_PATHS.events[EVENT.DISASTER] = "assets/images/events/event-disaster.svg";

  function createCard(id, category, name, imagePath) {
    return {
      id: id,
      category: category,
      name: name,
      imagePath: imagePath
    };
  }

  function createResourceCard(id, resourceType) {
    return createCard(id, CATEGORY.RESOURCE, resourceType, IMAGE_PATHS.resources[resourceType]);
  }

  function createToolCard(id, toolName) {
    return createCard(id, CATEGORY.TOOL, toolName, IMAGE_PATHS.tools[toolName]);
  }

  function createBuildingCard(id, buildingName) {
    return createCard(id, CATEGORY.BUILDING, buildingName, IMAGE_PATHS.buildings[buildingName]);
  }

  function createPersonnelCard(id, personnelName) {
    return createCard(id, CATEGORY.PERSONNEL, personnelName, IMAGE_PATHS.personnel[personnelName]);
  }

  function createEventCard(id, eventName) {
    return createCard(id, CATEGORY.EVENT, eventName, IMAGE_PATHS.events[eventName]);
  }

  function createCards(prefix, factory, type, count) {
    var cards = [];
    var index;

    for (index = 1; index <= count; index += 1) {
      cards.push(factory(prefix + String(index).padStart(3, "0"), type));
    }

    return cards;
  }

  function shuffleCards(cards) {
    var shuffled = cards.slice();
    var index;
    var swapIndex;
    var temp;

    for (index = shuffled.length - 1; index > 0; index -= 1) {
      swapIndex = Math.floor(Math.random() * (index + 1));
      temp = shuffled[index];
      shuffled[index] = shuffled[swapIndex];
      shuffled[swapIndex] = temp;
    }

    return shuffled;
  }

  function createPlayer(name, countryName, hand) {
    return {
      name: name,
      countryName: countryName,
      health: 10,
      gold: 0,
      attack: 0,
      defense: 2,
      equipment: [],
      buildings: [],
      personnel: [],
      modifiers: {
        woodAxeWoodBonus: 0,
        actionPointBonus: 0
      },
      hand: hand
    };
  }

  function createInitialDeck() {
    return createCards("D-W-", createResourceCard, RESOURCE.WOOD, 40)
      .concat(createCards("D-S-", createResourceCard, RESOURCE.STONE, 20))
      .concat(createCards("D-I-", createResourceCard, RESOURCE.IRON, 10))
      .concat(createCards("D-P-", createPersonnelCard, PERSONNEL.LUMBERJACK, 1))
      .concat(createCards("D-PS-", createPersonnelCard, PERSONNEL.SWORDSMAN, 2))
      .concat(createCards("D-PG-", createPersonnelCard, PERSONNEL.SAGE, 1))
      .concat([createEventCard("D-E-001", EVENT.DISASTER)]);
  }

  function createInitialState() {
    return {
      started: false,
      turn: 0,
      activePlayerKey: "self",
      actionPoints: 0,
      maxActionPoints: 2,
      winner: null,
      nextToolIds: {
        axe: 3,
        pickaxe: 2,
        stonePickaxe: 2,
        stoneSword: 1,
        ironSword: 1
      },
      nextResourceIds: {
        wood: 3
      },
      nextBuildingIds: {
        woodFence: 1,
        castleWall: 1,
        evolutionTemple: 1,
        victoryTemple: 1
      },
      statusMessage: "ゲーム開始前です。山札には木40・石20・鉄10・木こり1・剣士2・賢者1・災害1が入っています。",
      players: {
        self: createPlayer("プレイヤー1", "始まりの国", [
          createResourceCard("P-W-001", RESOURCE.WOOD),
          createResourceCard("P-W-002", RESOURCE.WOOD),
          createToolCard("P-TA-001", TOOL.WOOD_AXE)
        ]),
        opponent: createPlayer("プレイヤー2", "始まりの国", [
          createResourceCard("E-W-001", RESOURCE.WOOD),
          createResourceCard("E-W-002", RESOURCE.WOOD),
          createToolCard("E-TA-001", TOOL.WOOD_AXE)
        ])
      },
      shared: {
        deck: shuffleCards(createInitialDeck()),
        field: [],
        discard: []
      },
      labels: {
        category: CATEGORY,
        resource: RESOURCE,
        tool: TOOL,
        building: BUILDING,
        personnel: PERSONNEL,
        personnelCost: PERSONNEL_COST,
        personnelAttack: PERSONNEL_ATTACK,
        event: EVENT,
        toolAttack: TOOL_ATTACK,
        buildingDefense: BUILDING_DEFENSE
      }
    };
  }

  window.IntoTheMountainState = {
    createInitialState: createInitialState,
    createResourceCard: createResourceCard,
    createToolCard: createToolCard,
    createBuildingCard: createBuildingCard,
    createPersonnelCard: createPersonnelCard
  };
})();
