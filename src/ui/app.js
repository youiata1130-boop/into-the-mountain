(function () {
  var state = window.IntoTheMountainState.createInitialState();
  var dom = {};
  var labels = state.labels;
  var eventOverlayTimeoutId = null;
  var actionDefinitions = [];
  var selectedHandCardKey = "";
  var selectedFieldCardKey = "";
  var isBuildMenuOpen = false;
  var matchState = {
    roomCode: "",
    localPlayerKey: "",
    channel: null
  };
  var playMode = "local";
  var cpuTurnTimeoutId = null;
  var actionLogEntries = [];
  var actionToastTimeoutId = null;

  function cacheDom() {
    [
      "start-button",
      "reset-button",
      "mode-local-button",
      "mode-cpu-button",
      "gather-wood-button",
      "sell-wood-button",
      "sell-stone-button",
      "sell-iron-button",
      "craft-axe-button",
      "use-axe-button",
      "craft-pickaxe-button",
      "use-pickaxe-button",
      "craft-stone-pickaxe-button",
      "use-stone-pickaxe-button",
      "craft-stone-sword-button",
      "craft-iron-sword-button",
      "hire-lumberjack-button",
      "hire-swordsman-button",
      "hire-sage-button",
      "build-wood-fence-button",
      "build-castle-wall-button",
      "build-evolution-temple-button",
      "build-victory-temple-button",
      "attack-button",
      "end-turn-button",
      "event-overlay",
      "event-overlay-title",
      "event-overlay-image",
      "event-overlay-message",
      "action-toast",
      "opponent-hand",
      "self-hand",
      "shared-deck",
      "shared-field",
      "shared-discard",
      "opponent-hand-count",
      "self-hand-count",
      "shared-deck-count",
      "shared-field-count",
      "shared-discard-count",
      "status-text",
      "action-log",
      "create-match-button",
      "join-match-button",
      "room-code-input",
      "room-code-display",
      "room-status",
      "turn-number",
      "action-points",
      "play-mode-status",
      "self-country-name",
      "opponent-country-name",
      "self-health",
      "opponent-health",
      "self-gold",
      "self-attack",
      "opponent-attack",
      "self-defense",
      "opponent-defense",
      "self-equipment",
      "opponent-equipment",
      "self-buildings",
      "opponent-buildings",
      "self-personnel",
      "opponent-personnel",
      "opponent-player-label",
      "opponent-player-title",
      "self-player-label",
      "self-player-title",
      "wallet-label",
      "build-toggle-button",
      "build-command-panel",
      "contextual-command-panel",
      "contextual-action-hint"
    ].forEach(function (id) {
      dom[id] = document.getElementById(id);
    });
  }

  function syncLabels() {
    labels = state.labels;
  }

  function getActivePlayerKey() {
    return state.activePlayerKey;
  }

  function getWaitingPlayerKey() {
    return getActivePlayerKey() === "self" ? "opponent" : "self";
  }

  function getPlayer(key) {
    return state.players[key];
  }

  function getActivePlayer() {
    return getPlayer(getActivePlayerKey());
  }

  function getWaitingPlayer() {
    return getPlayer(getWaitingPlayerKey());
  }

  function getDisplaySelfPlayerKey() {
    if (isCpuMode() && !isMatched()) {
      return "self";
    }

    return getActivePlayerKey();
  }

  function getDisplayOpponentPlayerKey() {
    if (isCpuMode() && !isMatched()) {
      return "opponent";
    }

    return getWaitingPlayerKey();
  }

  function getDisplaySelfPlayer() {
    return getPlayer(getDisplaySelfPlayerKey());
  }

  function getDisplayOpponentPlayer() {
    return getPlayer(getDisplayOpponentPlayerKey());
  }

  function getPlayerPrefix(key) {
    return key === "self" ? "P" : "E";
  }

  function switchTurnPlayer() {
    state.activePlayerKey = getWaitingPlayerKey();
  }

  function isMatched() {
    return Boolean(matchState.roomCode);
  }

  function isCpuMode() {
    return playMode === "cpu";
  }

  function isCpuTurn() {
    return isCpuMode() && !isMatched() && getActivePlayerKey() === "opponent";
  }

  function canControlLocalTurn() {
    if (isMatched()) {
      return matchState.localPlayerKey === getActivePlayerKey();
    }

    if (isCpuMode()) {
      return getActivePlayerKey() === "self";
    }

    return true;
  }

  function generateRoomCode() {
    return Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function closeMatchChannel() {
    if (matchState.channel) {
      matchState.channel.close();
      matchState.channel = null;
    }
  }

  function clearCpuTurnTimer() {
    if (cpuTurnTimeoutId) {
      window.clearTimeout(cpuTurnTimeoutId);
      cpuTurnTimeoutId = null;
    }
  }

  function updateLocalPlayerNames() {
    if (isMatched()) {
      state.players.self.name = "プレイヤー1";
      state.players.opponent.name = "プレイヤー2";
      return;
    }

    if (isCpuMode()) {
      state.players.self.name = "あなた";
      state.players.opponent.name = "CPU";
      return;
    }

    state.players.self.name = "プレイヤー1";
    state.players.opponent.name = "プレイヤー2";
  }

  function setPlayMode(nextMode) {
    if (nextMode !== "local" && nextMode !== "cpu") {
      return;
    }

    playMode = nextMode;
    clearCpuTurnTimer();
    updateLocalPlayerNames();
    render();
  }

  function pushActionLog(message) {
    actionLogEntries.unshift(message);
    actionLogEntries = actionLogEntries.slice(0, 6);
  }

  function hideActionToast() {
    if (actionToastTimeoutId) {
      window.clearTimeout(actionToastTimeoutId);
      actionToastTimeoutId = null;
    }

    dom["action-toast"].hidden = true;
  }

  function showActionToast(message) {
    hideActionToast();
    dom["action-toast"].textContent = message;
    dom["action-toast"].hidden = false;
    actionToastTimeoutId = window.setTimeout(function () {
      dom["action-toast"].hidden = true;
      actionToastTimeoutId = null;
    }, 900);
  }

  function createShortActionText(subject, verb) {
    return subject + " " + verb;
  }

  function updateMatchPanel(statusMessage) {
    dom["room-code-display"].textContent = matchState.roomCode || "未作成";
    if (statusMessage) {
      dom["room-status"].textContent = statusMessage;
    }
    dom["start-button"].disabled = isMatched() && matchState.localPlayerKey !== "self";
    dom["reset-button"].disabled = isMatched() && matchState.localPlayerKey !== "self";
  }

  function openMatchChannel(roomCode, localPlayerKey) {
    closeMatchChannel();
    matchState.roomCode = roomCode;
    matchState.localPlayerKey = localPlayerKey;
    matchState.channel = new BroadcastChannel("into-the-mountain-room-" + roomCode);
    matchState.channel.addEventListener("message", handleMatchMessage);
  }

  function broadcastMessage(message) {
    if (!matchState.channel) {
      return;
    }
    matchState.channel.postMessage(message);
  }

  function broadcastState() {
    if (!isMatched()) {
      return;
    }
    broadcastMessage({
      type: "state-sync",
      state: state
    });
  }

  function handleMatchMessage(event) {
    var message = event.data || {};

    if (message.type === "join-request" && matchState.localPlayerKey === "self") {
      updateMatchPanel("プレイヤー2が参加しました。");
      broadcastState();
      return;
    }

    if (message.type === "state-sync") {
      state = message.state;
      syncLabels();
      buildActionDefinitions();
      render();
    }
  }

  function createMatch() {
    var roomCode = generateRoomCode();

    playMode = "local";
    clearCpuTurnTimer();
    openMatchChannel(roomCode, "self");
    updateLocalPlayerNames();
    updateMatchPanel("部屋を作成しました。別ウィンドウから参加してください。");
    broadcastState();
    render();
  }

  function joinMatch() {
    var roomCode = String(dom["room-code-input"].value || "").trim().toUpperCase();

    if (!roomCode) {
      updateMatchPanel("参加するには部屋コードを入力してください。");
      return;
    }

    playMode = "local";
    clearCpuTurnTimer();
    openMatchChannel(roomCode, "opponent");
    updateLocalPlayerNames();
    updateMatchPanel("参加をリクエストしました。ホストの状態を待っています。");
    broadcastMessage({ type: "join-request" });
    render();
  }

  function setEventOverlayVisible(visible) {
    dom["event-overlay"].hidden = !visible;
    dom["event-overlay"].setAttribute("aria-hidden", visible ? "false" : "true");
    dom["event-overlay"].classList.toggle("event-overlay-visible", visible);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setHtml(element, html) {
    element.innerHTML = html;
  }

  function createCardSelectionKey(category, name) {
    return category + "::" + name;
  }

  function clearSelectedHandCard() {
    selectedHandCardKey = "";
  }

  function clearSelectedFieldCard() {
    selectedFieldCardKey = "";
  }

  function clearSelectedCards() {
    clearSelectedHandCard();
    clearSelectedFieldCard();
  }

  function closeBuildMenu() {
    isBuildMenuOpen = false;
  }

  function syncSelectedHandCard() {
    if (!selectedHandCardKey) {
      return;
    }

    if (!summarizeCards(getActivePlayer().hand).some(function (summary) {
      return createCardSelectionKey(summary.category, summary.name) === selectedHandCardKey;
    })) {
      clearSelectedHandCard();
    }
  }

  function syncSelectedFieldCard() {
    if (!selectedFieldCardKey) {
      return;
    }

    if (!summarizeCards(state.shared.field).some(function (summary) {
      return createCardSelectionKey(summary.category, summary.name) === selectedFieldCardKey;
    })) {
      clearSelectedFieldCard();
    }
  }

  function hasCard(cards, category, name) {
    return cards.some(function (card) {
      return card.category === category && card.name === name;
    });
  }

  function hasBuilding(player, buildingName) {
    return player.buildings.some(function (building) {
      return building.name === buildingName;
    });
  }

  function countCards(cards, category, name) {
    var count = 0;

    cards.forEach(function (card) {
      if (card.category === category && card.name === name) {
        count += 1;
      }
    });

    return count;
  }

  function canAct() {
    return state.started && !state.winner && state.actionPoints > 0;
  }

  function hasAttackAction() {
    return getActivePlayer().attack > 0;
  }

  function isAttackTool(toolName) {
    return labels.toolAttack.hasOwnProperty(toolName);
  }

  function buildActionDefinitions() {
    actionDefinitions = [
      {
        id: "gather-wood-button",
        global: true,
        isVisible: function () {
          return canAct() && state.actionPoints >= 2;
        },
        run: function () {
          gatherWood();
        }
      },
      {
        id: "sell-wood-button",
        selection: {
          category: labels.category.RESOURCE,
          name: labels.resource.WOOD
        },
        isVisible: function () {
          return canAct() && hasCard(getActivePlayer().hand, labels.category.RESOURCE, labels.resource.WOOD);
        },
        run: function () {
          sellResource(labels.resource.WOOD, 1);
        }
      },
      {
        id: "sell-stone-button",
        selection: {
          category: labels.category.RESOURCE,
          name: labels.resource.STONE
        },
        isVisible: function () {
          return canAct() && hasCard(getActivePlayer().hand, labels.category.RESOURCE, labels.resource.STONE);
        },
        run: function () {
          sellResource(labels.resource.STONE, 3);
        }
      },
      {
        id: "sell-iron-button",
        selection: {
          category: labels.category.RESOURCE,
          name: labels.resource.IRON
        },
        isVisible: function () {
          return canAct() && hasCard(getActivePlayer().hand, labels.category.RESOURCE, labels.resource.IRON);
        },
        run: function () {
          sellResource(labels.resource.IRON, 5);
        }
      },
      {
        id: "craft-axe-button",
        selection: {
          category: labels.category.RESOURCE,
          name: labels.resource.WOOD
        },
        isVisible: function () {
          return canAct() && hasCard(getActivePlayer().hand, labels.category.RESOURCE, labels.resource.WOOD);
        },
        run: function () {
          craftTool(labels.tool.WOOD_AXE, "TA", "axe", labels.resource.WOOD);
        }
      },
      {
        id: "use-axe-button",
        selection: {
          category: labels.category.TOOL,
          name: labels.tool.WOOD_AXE
        },
        isVisible: function () {
          return canAct() && hasCard(getActivePlayer().hand, labels.category.TOOL, labels.tool.WOOD_AXE);
        },
        run: function () {
          gainResourcesFromField(labels.tool.WOOD_AXE, labels.resource.WOOD, 3);
        }
      },
      {
        id: "craft-pickaxe-button",
        selection: {
          category: labels.category.RESOURCE,
          name: labels.resource.WOOD
        },
        isVisible: function () {
          return canAct() && hasCard(getActivePlayer().hand, labels.category.RESOURCE, labels.resource.WOOD);
        },
        run: function () {
          craftTool(labels.tool.WOOD_PICKAXE, "TP", "pickaxe", labels.resource.WOOD);
        }
      },
      {
        id: "use-pickaxe-button",
        selection: {
          category: labels.category.TOOL,
          name: labels.tool.WOOD_PICKAXE
        },
        isVisible: function () {
          return canAct() && hasCard(getActivePlayer().hand, labels.category.TOOL, labels.tool.WOOD_PICKAXE);
        },
        run: function () {
          gainResourcesFromField(labels.tool.WOOD_PICKAXE, labels.resource.STONE, 1);
        }
      },
      {
        id: "craft-stone-pickaxe-button",
        selection: {
          category: labels.category.RESOURCE,
          name: labels.resource.STONE
        },
        isVisible: function () {
          return canAct() && hasCard(getActivePlayer().hand, labels.category.RESOURCE, labels.resource.STONE);
        },
        run: function () {
          craftTool(labels.tool.STONE_PICKAXE, "SP", "stonePickaxe", labels.resource.STONE);
        }
      },
      {
        id: "use-stone-pickaxe-button",
        selection: {
          category: labels.category.TOOL,
          name: labels.tool.STONE_PICKAXE
        },
        isVisible: function () {
          return canAct() && hasCard(getActivePlayer().hand, labels.category.TOOL, labels.tool.STONE_PICKAXE);
        },
        run: function () {
          gainResourcesFromField(labels.tool.STONE_PICKAXE, labels.resource.IRON, 1);
        }
      },
      {
        id: "craft-stone-sword-button",
        selection: {
          category: labels.category.RESOURCE,
          name: labels.resource.STONE
        },
        isVisible: function () {
          return canAct() && hasCard(getActivePlayer().hand, labels.category.RESOURCE, labels.resource.STONE);
        },
        run: function () {
          craftTool(labels.tool.STONE_SWORD, "TS", "stoneSword", labels.resource.STONE);
        }
      },
      {
        id: "craft-iron-sword-button",
        selection: {
          category: labels.category.RESOURCE,
          name: labels.resource.IRON
        },
        isVisible: function () {
          return canAct()
            && hasBuilding(getActivePlayer(), labels.building.EVOLUTION_TEMPLE)
            && hasCard(getActivePlayer().hand, labels.category.RESOURCE, labels.resource.IRON);
        },
        run: function () {
          craftTool(labels.tool.IRON_SWORD, "IS", "ironSword", labels.resource.IRON);
        }
      },
      {
        id: "hire-lumberjack-button",
        selectionZone: "field",
        selection: {
          category: labels.category.PERSONNEL,
          name: labels.personnel.LUMBERJACK
        },
        isVisible: function () {
          return canAct()
            && hasCard(state.shared.field, labels.category.PERSONNEL, labels.personnel.LUMBERJACK)
            && getActivePlayer().gold >= labels.personnelCost[labels.personnel.LUMBERJACK];
        },
        run: function () {
          hirePersonnel(labels.personnel.LUMBERJACK);
        }
      },
      {
        id: "hire-swordsman-button",
        selectionZone: "field",
        selection: {
          category: labels.category.PERSONNEL,
          name: labels.personnel.SWORDSMAN
        },
        isVisible: function () {
          return canAct()
            && hasCard(state.shared.field, labels.category.PERSONNEL, labels.personnel.SWORDSMAN)
            && getActivePlayer().gold >= labels.personnelCost[labels.personnel.SWORDSMAN];
        },
        run: function () {
          hirePersonnel(labels.personnel.SWORDSMAN);
        }
      },
      {
        id: "hire-sage-button",
        selectionZone: "field",
        selection: {
          category: labels.category.PERSONNEL,
          name: labels.personnel.SAGE
        },
        isVisible: function () {
          return canAct()
            && hasCard(state.shared.field, labels.category.PERSONNEL, labels.personnel.SAGE)
            && getActivePlayer().gold >= labels.personnelCost[labels.personnel.SAGE];
        },
        run: function () {
          hirePersonnel(labels.personnel.SAGE);
        }
      },
      {
        id: "build-wood-fence-button",
        global: true,
        isVisible: function () {
          return canAct()
            && !hasBuilding(getActivePlayer(), labels.building.WOOD_FENCE)
            && countCards(getActivePlayer().hand, labels.category.RESOURCE, labels.resource.WOOD) >= 2;
        },
        run: function () {
          buildWoodFence();
        }
      },
      {
        id: "build-castle-wall-button",
        global: true,
        isVisible: function () {
          return canAct()
            && hasBuilding(getActivePlayer(), labels.building.EVOLUTION_TEMPLE)
            && !hasBuilding(getActivePlayer(), labels.building.CASTLE_WALL)
            && countCards(getActivePlayer().hand, labels.category.RESOURCE, labels.resource.STONE) >= 2;
        },
        run: function () {
          buildCastleWall();
        }
      },
      {
        id: "build-evolution-temple-button",
        global: true,
        isVisible: function () {
          return canAct()
            && !hasBuilding(getActivePlayer(), labels.building.EVOLUTION_TEMPLE)
            && countCards(getActivePlayer().hand, labels.category.RESOURCE, labels.resource.WOOD) >= 3
            && countCards(getActivePlayer().hand, labels.category.RESOURCE, labels.resource.IRON) >= 1;
        },
        run: function () {
          buildEvolutionTemple();
        }
      },
      {
        id: "build-victory-temple-button",
        global: true,
        isVisible: function () {
          return canAct()
            && hasBuilding(getActivePlayer(), labels.building.EVOLUTION_TEMPLE)
            && !hasBuilding(getActivePlayer(), labels.building.VICTORY_TEMPLE)
            && countCards(getActivePlayer().hand, labels.category.RESOURCE, labels.resource.WOOD) >= 3
            && countCards(getActivePlayer().hand, labels.category.RESOURCE, labels.resource.STONE) >= 2
            && countCards(getActivePlayer().hand, labels.category.RESOURCE, labels.resource.IRON) >= 1;
        },
        run: function () {
          buildVictoryTemple();
        }
      },
      {
        id: "attack-button",
        global: true,
        isVisible: function () {
          return canAct() && hasAttackAction();
        },
        run: function () {
          attackOpponent();
        }
      },
      {
        id: "end-turn-button",
        global: true,
        isVisible: function () {
          return state.started && !state.winner;
        },
        run: function () {
          endTurn();
        }
      }
    ];
  }

  function createCardMarkup(title, artMarkup, footerMarkup, className) {
    return [
      '<article class="' + className + '">',
      '<p class="card-title">' + title + "</p>",
      artMarkup,
      footerMarkup,
      "</article>"
    ].join("");
  }

  function createSummaryCardMarkup(summary, hidden, options) {
    var className;
    var attributes = "";

    options = options || {};

    if (hidden) {
      return createCardMarkup(
        "手札の概要",
        '<div class="card-back-art" aria-hidden="true"></div>',
        '<p class="hand-summary-count">x ' + summary.count + "</p>",
        "card card-hidden hand-summary-card"
      );
    }

    className = "card hand-summary-card";
    if (options.selectable) {
      className += " hand-summary-card-selectable";
      attributes += ' data-selection-key="' + escapeHtml(createCardSelectionKey(summary.category, summary.name)) + '"';
    }
    if (options.selected) {
      className += " hand-summary-card-selected";
    }

    return [
      '<article class="' + className + '"' + attributes + '>',
      '<p class="card-title">' + escapeHtml(summary.category) + " | " + escapeHtml(summary.name) + "</p>",
      '<img class="card-art" src="' + escapeHtml(summary.imagePath) + '" alt="' + escapeHtml(summary.name) + '">',
      '<p class="hand-summary-count">x ' + summary.count + "</p>",
      "</article>"
    ].join("");
  }

  function summarizeCards(cards) {
    var summaryMap = {};
    var order = [];
    var categoryOrder = {};
    var resourceOrder = {};
    var toolOrder = {};
    var buildingOrder = {};
    var personnelOrder = {};

    categoryOrder[labels.category.RESOURCE] = 0;
    categoryOrder[labels.category.TOOL] = 1;
    categoryOrder[labels.category.BUILDING] = 2;
    categoryOrder[labels.category.PERSONNEL] = 3;
    categoryOrder[labels.category.EVENT] = 4;

    resourceOrder[labels.resource.WOOD] = 0;
    resourceOrder[labels.resource.STONE] = 1;
    resourceOrder[labels.resource.IRON] = 2;

    toolOrder[labels.tool.WOOD_AXE] = 0;
    toolOrder[labels.tool.WOOD_PICKAXE] = 1;
    toolOrder[labels.tool.STONE_PICKAXE] = 2;
    toolOrder[labels.tool.STONE_SWORD] = 3;
    toolOrder[labels.tool.IRON_SWORD] = 4;

    buildingOrder[labels.building.WOOD_FENCE] = 0;
    buildingOrder[labels.building.CASTLE_WALL] = 1;
    buildingOrder[labels.building.EVOLUTION_TEMPLE] = 2;
    buildingOrder[labels.building.VICTORY_TEMPLE] = 3;

    personnelOrder[labels.personnel.LUMBERJACK] = 0;
    personnelOrder[labels.personnel.SWORDSMAN] = 1;
    personnelOrder[labels.personnel.SAGE] = 2;

    cards.forEach(function (card) {
      var key = card.category + "::" + card.name;

      if (!summaryMap[key]) {
        summaryMap[key] = {
          category: card.category,
          name: card.name,
          imagePath: card.imagePath,
          count: 0
        };
        order.push(key);
      }

      summaryMap[key].count += 1;
    });

    order.sort(function (leftKey, rightKey) {
      var left = summaryMap[leftKey];
      var right = summaryMap[rightKey];
      var leftCategory = categoryOrder.hasOwnProperty(left.category) ? categoryOrder[left.category] : 99;
      var rightCategory = categoryOrder.hasOwnProperty(right.category) ? categoryOrder[right.category] : 99;
      var leftNameOrder;
      var rightNameOrder;

      if (leftCategory !== rightCategory) {
        return leftCategory - rightCategory;
      }

      if (left.category === labels.category.RESOURCE) {
        leftNameOrder = resourceOrder.hasOwnProperty(left.name) ? resourceOrder[left.name] : 99;
        rightNameOrder = resourceOrder.hasOwnProperty(right.name) ? resourceOrder[right.name] : 99;
        if (leftNameOrder !== rightNameOrder) {
          return leftNameOrder - rightNameOrder;
        }
      }

      if (left.category === labels.category.TOOL) {
        leftNameOrder = toolOrder.hasOwnProperty(left.name) ? toolOrder[left.name] : 99;
        rightNameOrder = toolOrder.hasOwnProperty(right.name) ? toolOrder[right.name] : 99;
        if (leftNameOrder !== rightNameOrder) {
          return leftNameOrder - rightNameOrder;
        }
      }

      if (left.category === labels.category.BUILDING) {
        leftNameOrder = buildingOrder.hasOwnProperty(left.name) ? buildingOrder[left.name] : 99;
        rightNameOrder = buildingOrder.hasOwnProperty(right.name) ? buildingOrder[right.name] : 99;
        if (leftNameOrder !== rightNameOrder) {
          return leftNameOrder - rightNameOrder;
        }
      }

      if (left.category === labels.category.PERSONNEL) {
        leftNameOrder = personnelOrder.hasOwnProperty(left.name) ? personnelOrder[left.name] : 99;
        rightNameOrder = personnelOrder.hasOwnProperty(right.name) ? personnelOrder[right.name] : 99;
        if (leftNameOrder !== rightNameOrder) {
          return leftNameOrder - rightNameOrder;
        }
      }

      return left.name.localeCompare(right.name, "ja");
    });

    return order.map(function (key) {
      return summaryMap[key];
    });
  }

  function renderSummaryList(container, cards, hidden, selectable, selectedKey) {
    var summaries;

    selectable = Boolean(selectable);

    if (cards.length === 0) {
      renderEmpty(container, "カードがありません");
      return;
    }

    if (hidden) {
      setHtml(container, createSummaryCardMarkup({ count: cards.length }, true));
      return;
    }

    summaries = summarizeCards(cards);

    setHtml(container, summaries.map(function (summary) {
      return createSummaryCardMarkup(summary, false, {
        selectable: selectable,
        selected: selectable && createCardSelectionKey(summary.category, summary.name) === selectedKey
      });
    }).join(""));
  }

  function renderEmpty(container, message) {
    setHtml(container, '<p class="empty-text">' + escapeHtml(message) + "</p>");
  }

  function getBuildingBadge(item) {
    if (item.defenseBonus > 0) {
      return "+" + item.defenseBonus;
    }
    if (item.badgeType) {
      return item.badgeType;
    }
    return "";
  }

  function renderIconList(container, items, emptyMessage, badgeResolver, extraClassName) {
    var groupIndexes = {};
    var groupedItems = [];

    if (!items || items.length === 0) {
      renderEmpty(container, emptyMessage);
      return;
    }

    items.forEach(function (item) {
      var badge = badgeResolver(item);
      var groupKey = item.name + "::" + badge;
      var groupIndex;

      if (!Object.prototype.hasOwnProperty.call(groupIndexes, groupKey)) {
        groupIndexes[groupKey] = groupedItems.length;
        groupedItems.push({ item: item, badge: badge, count: 0 });
      }

      groupIndex = groupIndexes[groupKey];
      groupedItems[groupIndex].count += 1;
    });

    setHtml(container, groupedItems.map(function (group) {
      var item = group.item;
      var badge = group.badge;
      var title = item.name + (group.count > 1 ? " ×" + group.count : "");

      return [
        '<div class="equipment-icon ' + extraClassName + '" title="' + escapeHtml(title) + '">',
        '<img class="equipment-icon-image" src="' + escapeHtml(item.imagePath) + '" alt="' + escapeHtml(item.name) + '">',
        group.count > 1 ? '<span class="equipment-icon-count">×' + group.count + "</span>" : "",
        badge ? '<span class="equipment-icon-power">' + escapeHtml(badge) + "</span>" : "",
        "</div>"
      ].join("");
    }).join(""));
  }

  function renderEquipment(container, equipment) {
    renderIconList(container, equipment, "装備なし", function (item) {
      return "+" + item.attackBonus;
    }, "");
  }

  function renderBuildings(container, buildings) {
    renderIconList(container, buildings, "建物なし", getBuildingBadge, "building-icon");
  }

  function renderPersonnel(container, personnel) {
    renderIconList(container, personnel, "人材なし", function (item) {
      if (item.attackBonus > 0) {
        return "+" + item.attackBonus;
      }
      return item.badgeType || "人材";
    }, "personnel-icon");
  }

  function countCardsByName(cards, category, names) {
    var counts = {};

    names.forEach(function (name) {
      counts[name] = 0;
    });

    cards.forEach(function (card) {
      if (card.category === category && counts.hasOwnProperty(card.name)) {
        counts[card.name] += 1;
      }
    });

    return counts;
  }

  function renderDeck(cards) {
    var resourceCounts;

    if (cards.length === 0) {
      renderEmpty(dom["shared-deck"], "山札は空です");
      return;
    }

    resourceCounts = countCardsByName(cards, labels.category.RESOURCE, [
      labels.resource.WOOD,
      labels.resource.STONE,
      labels.resource.IRON
    ]);

    setHtml(dom["shared-deck"], [
      '<div class="stack-card stack-card-back">',
      '<p class="card-title">山札</p>',
      '<div class="card-back-art" aria-hidden="true"></div>',
      '<p class="stack-total">' + cards.length + "</p>",
      '<p class="stack-count">残り枚数</p>',
      '<div class="deck-breakdown">',
      '<span class="deck-breakdown-item">木 ' + resourceCounts[labels.resource.WOOD] + "</span>",
      '<span class="deck-breakdown-item">石 ' + resourceCounts[labels.resource.STONE] + "</span>",
      '<span class="deck-breakdown-item">鉄 ' + resourceCounts[labels.resource.IRON] + "</span>",
      "</div>",
      "</div>"
    ].join(""));
  }

  function renderDiscard(cards) {
    setHtml(dom["shared-discard"], [
      '<div class="stack-card discard-stack">',
      '<p class="card-title">捨て札</p>',
      '<div class="discard-stack-art" aria-hidden="true"></div>',
      '<p class="stack-total">' + cards.length + "</p>",
      '<p class="stack-count">枚数のみ表示</p>',
      "</div>"
    ].join(""));
  }

  function renderCount(element, count) {
    element.textContent = count + " 枚";
  }

  function renderStatus() {
    dom["status-text"].textContent = state.statusMessage;
    dom["turn-number"].textContent = String(state.turn);
    dom["action-points"].textContent = String(state.actionPoints);
  }

  function renderActionLog() {
    if (!actionLogEntries.length) {
      renderEmpty(dom["action-log"], "まだ行動はありません");
      return;
    }

    setHtml(dom["action-log"], actionLogEntries.map(function (entry) {
      return '<p class="action-log-item">' + escapeHtml(entry) + "</p>";
    }).join(""));
  }

  function renderPlayMode() {
    dom["play-mode-status"].textContent = isCpuMode() ? "CPU対戦" : "ローカル対戦";
    dom["mode-local-button"].classList.toggle("mode-button-active", !isCpuMode());
    dom["mode-cpu-button"].classList.toggle("mode-button-active", isCpuMode());
    dom["mode-local-button"].disabled = isMatched();
    dom["mode-cpu-button"].disabled = isMatched();
  }

  function showEventOverlay(title, imagePath, message) {
    if (eventOverlayTimeoutId) {
      clearTimeout(eventOverlayTimeoutId);
    }

    dom["event-overlay-title"].textContent = title;
    dom["event-overlay-image"].src = imagePath;
    dom["event-overlay-image"].alt = title;
    dom["event-overlay-message"].textContent = message;
    setEventOverlayVisible(true);

    eventOverlayTimeoutId = window.setTimeout(function () {
      setEventOverlayVisible(false);
      eventOverlayTimeoutId = null;
    }, 1800);
  }

  function hideEventOverlay() {
    if (eventOverlayTimeoutId) {
      clearTimeout(eventOverlayTimeoutId);
      eventOverlayTimeoutId = null;
    }

    setEventOverlayVisible(false);
  }

  function renderPlayerAreaTexts(selfPlayer, opponentPlayer) {
    dom["self-player-label"].textContent = isCpuMode() && !isMatched() ? "あなたの手札" : "手番プレイヤー";
    dom["self-player-title"].textContent = selfPlayer.name;
    dom["opponent-player-label"].textContent = isCpuMode() && !isMatched() ? "CPUの手札" : "待機プレイヤー";
    dom["opponent-player-title"].textContent = opponentPlayer.name + " の手札";
    dom["wallet-label"].textContent = "所持金";
  }

  function renderCountries() {
    var selfPlayer = getDisplaySelfPlayer();
    var opponentPlayer = getDisplayOpponentPlayer();

    dom["self-country-name"].textContent = selfPlayer.countryName;
    dom["opponent-country-name"].textContent = opponentPlayer.countryName;
    dom["self-health"].textContent = String(selfPlayer.health);
    dom["opponent-health"].textContent = String(opponentPlayer.health);
    dom["self-gold"].textContent = String(selfPlayer.gold);
    dom["self-attack"].textContent = String(selfPlayer.attack);
    dom["opponent-attack"].textContent = String(opponentPlayer.attack);
    dom["self-defense"].textContent = String(selfPlayer.defense);
    dom["opponent-defense"].textContent = String(opponentPlayer.defense);
    renderEquipment(dom["self-equipment"], selfPlayer.equipment);
    renderEquipment(dom["opponent-equipment"], opponentPlayer.equipment);
    renderBuildings(dom["self-buildings"], selfPlayer.buildings);
    renderBuildings(dom["opponent-buildings"], opponentPlayer.buildings);
    renderPersonnel(dom["self-personnel"], selfPlayer.personnel);
    renderPersonnel(dom["opponent-personnel"], opponentPlayer.personnel);
    renderPlayerAreaTexts(selfPlayer, opponentPlayer);
  }

  function setButtonVisibility(buttonId, visible) {
    dom[buttonId].hidden = !visible;
  }

  function getSelectedCardActionMatch(action) {
    var selectedKey = action.selectionZone === "field" ? selectedFieldCardKey : selectedHandCardKey;

    return action.selection
      && selectedKey
      && createCardSelectionKey(action.selection.category, action.selection.name) === selectedKey;
  }

  function getSelectedHandSummary() {
    var summaries;
    var index;

    if (!selectedHandCardKey) {
      return null;
    }

    summaries = summarizeCards(getActivePlayer().hand);
    for (index = 0; index < summaries.length; index += 1) {
      if (createCardSelectionKey(summaries[index].category, summaries[index].name) === selectedHandCardKey) {
        return summaries[index];
      }
    }

    return null;
  }

  function getSelectedFieldSummary() {
    var summaries;
    var index;

    if (!selectedFieldCardKey) {
      return null;
    }

    summaries = summarizeCards(state.shared.field);
    for (index = 0; index < summaries.length; index += 1) {
      if (createCardSelectionKey(summaries[index].category, summaries[index].name) === selectedFieldCardKey) {
        return summaries[index];
      }
    }

    return null;
  }

  function renderActionButtons() {
    var buildVisibleCount = 0;
    var contextualVisibleCount = 0;
    var selectedSummary = getSelectedHandSummary() || getSelectedFieldSummary();
    var activePlayer = getActivePlayer();
    var canOpenBuildMenu = false;

    actionDefinitions.forEach(function (action) {
      var visible = false;

      if (action.id.indexOf("build-") === 0) {
        canOpenBuildMenu = canOpenBuildMenu || (action.isVisible() && canControlLocalTurn());
        visible = action.isVisible() && canControlLocalTurn() && isBuildMenuOpen;
      } else if (action.global || action.id === "attack-button" || action.id === "end-turn-button") {
        visible = action.isVisible() && canControlLocalTurn();
      } else {
        visible = action.isVisible()
          && canControlLocalTurn()
          && getSelectedCardActionMatch(action);
      }

      setButtonVisibility(action.id, visible);

      if (visible && action.id.indexOf("build-") === 0) {
        buildVisibleCount += 1;
      }

      if (
        visible
        && action.id !== "attack-button"
        && action.id !== "end-turn-button"
        && action.id.indexOf("build-") !== 0
      ) {
        contextualVisibleCount += 1;
      }
    });

    if (!canOpenBuildMenu) {
      closeBuildMenu();
    }

    dom["build-toggle-button"].disabled = !canControlLocalTurn();
    dom["build-toggle-button"].classList.toggle("build-toggle-button-open", isBuildMenuOpen && canOpenBuildMenu);
    dom["build-command-panel"].hidden = !isBuildMenuOpen;
    dom["build-command-panel"].classList.toggle("command-panel-empty", buildVisibleCount === 0);
    dom["contextual-command-panel"].classList.toggle("command-panel-empty", contextualVisibleCount === 0);

    if (!canControlLocalTurn()) {
      dom["contextual-action-hint"].textContent = "相手の手番です";
      return;
    }

    if (!selectedSummary) {
      dom["contextual-action-hint"].textContent = "手札または場札のカードを選ぶと行動が表示されます";
      return;
    }

    if (contextualVisibleCount === 0) {
      if (
        selectedSummary.category === labels.category.PERSONNEL
        && labels.personnelCost[selectedSummary.name]
        && activePlayer.gold < labels.personnelCost[selectedSummary.name]
      ) {
        dom["contextual-action-hint"].textContent =
          selectedSummary.name + "を雇用するには金貨 " + labels.personnelCost[selectedSummary.name] + " 枚が必要です";
        return;
      }

      dom["contextual-action-hint"].textContent = selectedSummary.name + " では実行できる行動がありません";
      return;
    }

    dom["contextual-action-hint"].textContent = selectedSummary.category + " " + selectedSummary.name + " の行動";
  }

  function render() {
    var activePlayer = getActivePlayer();
    var selfPlayer = getDisplaySelfPlayer();
    var opponentPlayer = getDisplayOpponentPlayer();

    syncSelectedHandCard();
    syncSelectedFieldCard();
    renderSummaryList(dom["opponent-hand"], opponentPlayer.hand, true, false, "");
    renderSummaryList(dom["self-hand"], selfPlayer.hand, false, canControlLocalTurn(), selectedHandCardKey);
    renderDeck(state.shared.deck);
    renderSummaryList(dom["shared-field"], state.shared.field, false, canControlLocalTurn(), selectedFieldCardKey);
    renderDiscard(state.shared.discard);
    renderCount(dom["opponent-hand-count"], opponentPlayer.hand.length);
    renderCount(dom["self-hand-count"], selfPlayer.hand.length);
    renderCount(dom["shared-deck-count"], state.shared.deck.length);
    renderCount(dom["shared-field-count"], state.shared.field.length);
    renderCount(dom["shared-discard-count"], state.shared.discard.length);
    renderStatus();
    renderActionLog();
    renderPlayMode();
    renderCountries();
    renderActionButtons();
    if (isMatched()) {
      updateMatchPanel(
        matchState.localPlayerKey === getActivePlayerKey()
          ? "あなたの手番です。"
          : "相手の手番です。待機してください。"
      );
    }

    scheduleCpuTurn();
  }

  function scheduleCpuTurn() {
    clearCpuTurnTimer();

    if (!isCpuTurn() || !state.started || state.winner) {
      return;
    }

    cpuTurnTimeoutId = window.setTimeout(executeCpuTurn, 700);
  }

  function moveFirstMatchingCard(cards, matcher) {
    var index;

    for (index = 0; index < cards.length; index += 1) {
      if (matcher(cards[index])) {
        return cards.splice(index, 1)[0];
      }
    }

    return null;
  }

  function takeCard(cards, category, name) {
    return moveFirstMatchingCard(cards, function (card) {
      return card.category === category && card.name === name;
    });
  }

  function takeCards(cards, category, name, count) {
    var taken = [];
    var index;
    var card;

    for (index = 0; index < count; index += 1) {
      card = takeCard(cards, category, name);
      if (!card) {
        cards.unshift.apply(cards, taken);
        return null;
      }
      taken.push(card);
    }

    return taken;
  }

  function addFieldCards(count) {
    var addCount = Math.min(count, state.shared.deck.length);
    var openedCards;
    var addedCount = 0;
    var triggeredEvents = [];

    if (addCount <= 0) {
      return {
        addedCount: 0,
        triggeredEvents: triggeredEvents
      };
    }

    openedCards = state.shared.deck.splice(0, addCount);
    openedCards.forEach(function (card) {
      if (card.category === labels.category.EVENT && card.name === labels.event.DISASTER) {
        state.shared.discard.push(card);
        if (state.shared.field.length > 0) {
          state.shared.discard = state.shared.discard.concat(state.shared.field);
          state.shared.field = [];
        }
        triggeredEvents.push({
          name: card.name,
          imagePath: card.imagePath,
          message: "災害が発生しました。場にあるカードはすべて捨て札に移動します。"
        });
        return;
      }

      state.shared.field.push(card);
      addedCount += 1;
    });

    return {
      addedCount: addedCount,
      triggeredEvents: triggeredEvents
    };
  }

  function beginNextTurn(prefix) {
    var drawResult;
    var message;
    var activePlayer;

    if (state.winner) {
      return;
    }

    state.turn += 1;
    activePlayer = getActivePlayer();
    state.actionPoints = state.maxActionPoints + (activePlayer.modifiers.actionPointBonus || 0);
    drawResult = addFieldCards(3);
    message = (prefix || "") + activePlayer.name + " のターン " + state.turn + " を開始しました。";

    if (drawResult.addedCount > 0) {
      message += " 場に" + drawResult.addedCount + "枚追加しました。";
    } else if (state.shared.deck.length <= 0) {
      message += " 山札が空のため、場札の追加はありません。";
    }

    drawResult.triggeredEvents.forEach(function (eventInfo) {
      message += " イベントカード「" + eventInfo.name + "」が発生しました。";
      showEventOverlay(eventInfo.name, eventInfo.imagePath, eventInfo.message);
    });

    state.statusMessage = message;
  }

  function endTurn() {
    var previousPlayerName;

    if (!state.started || state.winner) {
      render();
      return;
    }

    previousPlayerName = getActivePlayer().name;
    switchTurnPlayer();
    beginNextTurn(previousPlayerName + " がターンを終了して、");
    broadcastState();
    render();
  }

  function consumeActionPoint() {
    if (state.winner) {
      state.statusMessage = state.winner + " の勝利でゲームは終了しています。";
      render();
      return false;
    }

    if (!state.started) {
      state.statusMessage = "先にゲームを開始してください。";
      render();
      return false;
    }

    if (state.actionPoints <= 0) {
      state.statusMessage = "行動ポイントがありません。ターンを終了してください。";
      render();
      return false;
    }

    state.actionPoints -= 1;
    return true;
  }

  function consumeActionPoints(count, failureMessage) {
    var consumed = 0;

    while (consumed < count) {
      if (!consumeActionPoint()) {
        state.actionPoints += consumed;
        if (failureMessage) {
          state.statusMessage = failureMessage;
        }
        render();
        return false;
      }
      consumed += 1;
    }

    return true;
  }

  function restoreActionPoint(message) {
    state.actionPoints += 1;
    state.statusMessage = message;
    render();
  }

  function finishGame(winnerName, message, shortMessage) {
    clearCpuTurnTimer();
    state.winner = winnerName;
    state.started = false;
    state.actionPoints = 0;
    state.statusMessage = message;
    pushActionLog(message);
    if (shortMessage) {
      showActionToast(shortMessage);
    }
    broadcastState();
    render();
  }

  function finishAction(message, shortMessage) {
    pushActionLog(message);
    if (shortMessage) {
      showActionToast(shortMessage);
    }

    if (state.winner) {
      clearSelectedHandCard();
      closeBuildMenu();
      render();
      return;
    }

    if (state.actionPoints <= 0) {
      switchTurnPlayer();
      beginNextTurn(message + " 行動ポイントを使い切りました。");
    } else {
      state.statusMessage = message + " 残り行動ポイントは" + state.actionPoints + "です。";
    }

    syncSelectedHandCard();
    closeBuildMenu();
    broadcastState();
    render();
  }

  function startGame() {
    if (state.started) {
      state.statusMessage = "すでにゲーム開始済みです。リセット後に再開してください。";
      render();
      return;
    }

    hideEventOverlay();
    hideActionToast();
    clearCpuTurnTimer();
    clearSelectedHandCard();
    closeBuildMenu();
    updateLocalPlayerNames();
    actionLogEntries = [];
    state.started = true;
    state.winner = null;
    state.turn = 0;
    state.activePlayerKey = "self";
    beginNextTurn("");
    broadcastState();
    render();
  }

  function equipAttackTool(card, attackBonus) {
    var activePlayer = getActivePlayer();

    state.shared.discard.push(card);
    activePlayer.equipment.push({
      id: card.id,
      name: card.name,
      imagePath: card.imagePath,
      attackBonus: attackBonus
    });
    activePlayer.attack += attackBonus;
  }

  function addBuilding(card, defenseBonus, badgeType) {
    var activePlayer = getActivePlayer();

    state.shared.discard.push(card);
    activePlayer.buildings.push({
      id: card.id,
      name: card.name,
      imagePath: card.imagePath,
      defenseBonus: defenseBonus,
      badgeType: badgeType || ""
    });
    activePlayer.defense += defenseBonus;
  }

  function createOwnedToolId(toolCode, toolKey) {
    return getPlayerPrefix(getActivePlayerKey()) + "-" + toolCode + "-" + String(state.nextToolIds[toolKey]).padStart(3, "0");
  }

  function createOwnedBuildingId(buildingCode, buildingKey) {
    return getPlayerPrefix(getActivePlayerKey()) + "-" + buildingCode + "-" + String(state.nextBuildingIds[buildingKey]).padStart(3, "0");
  }

  function createOwnedResourceId(resourceCode, resourceKey) {
    return getPlayerPrefix(getActivePlayerKey()) + "-" + resourceCode + "-" + String(state.nextResourceIds[resourceKey]).padStart(3, "0");
  }

  function craftTool(toolName, toolCode, toolKey, resourceName) {
    var activePlayer = getActivePlayer();
    var usedResource;
    var createdTool;
    var attackBonus = labels.toolAttack[toolName] || 0;

    if (!consumeActionPoint()) {
      return;
    }

    usedResource = takeCard(activePlayer.hand, labels.category.RESOURCE, resourceName);

    if (!usedResource) {
      restoreActionPoint(resourceName + "が手札にないため、" + toolName + "を作成できません。");
      return;
    }

    state.shared.discard.push(usedResource);
    createdTool = window.IntoTheMountainState.createToolCard(createOwnedToolId(toolCode, toolKey), toolName);
    state.nextToolIds[toolKey] += 1;

    if (isAttackTool(toolName)) {
      equipAttackTool(createdTool, attackBonus);
      finishAction(
        activePlayer.name + " が " + toolName + "を装備しました。攻撃力が" + attackBonus + "上がりました。",
        createShortActionText(toolName, "装備")
      );
      return;
    }

    activePlayer.hand.push(createdTool);
    finishAction(activePlayer.name + " が " + toolName + "を作成しました。", createShortActionText(toolName, "作成"));
  }

  function buildWoodFence() {
    var activePlayer = getActivePlayer();
    var usedResources;
    var buildingCard;
    var defenseBonus = labels.buildingDefense[labels.building.WOOD_FENCE];

    if (!consumeActionPoint()) {
      return;
    }

    if (hasBuilding(activePlayer, labels.building.WOOD_FENCE)) {
      restoreActionPoint(labels.building.WOOD_FENCE + "はすでに建っています。");
      return;
    }

    usedResources = takeCards(activePlayer.hand, labels.category.RESOURCE, labels.resource.WOOD, 2);

    if (!usedResources) {
      restoreActionPoint("木が2枚ないため、" + labels.building.WOOD_FENCE + "を建てられません。");
      return;
    }

    state.shared.discard = state.shared.discard.concat(usedResources);
    buildingCard = window.IntoTheMountainState.createBuildingCard(createOwnedBuildingId("BF", "woodFence"), labels.building.WOOD_FENCE);
    state.nextBuildingIds.woodFence += 1;
    addBuilding(buildingCard, defenseBonus, "");
    finishAction(
      activePlayer.name + " が " + labels.building.WOOD_FENCE + "を建てました。防御力が" + defenseBonus + "上がりました。",
      createShortActionText(labels.building.WOOD_FENCE, "建設")
    );
  }

  function buildCastleWall() {
    var activePlayer = getActivePlayer();
    var usedStones;
    var buildingCard;
    var defenseBonus = labels.buildingDefense[labels.building.CASTLE_WALL];

    if (!consumeActionPoint()) {
      return;
    }

    if (!hasBuilding(activePlayer, labels.building.EVOLUTION_TEMPLE)) {
      restoreActionPoint(labels.building.EVOLUTION_TEMPLE + "の建設後でないと、" + labels.building.CASTLE_WALL + "は建てられません。");
      return;
    }

    if (hasBuilding(activePlayer, labels.building.CASTLE_WALL)) {
      restoreActionPoint(labels.building.CASTLE_WALL + "はすでに建っています。");
      return;
    }

    usedStones = takeCards(activePlayer.hand, labels.category.RESOURCE, labels.resource.STONE, 2);

    if (!usedStones) {
      restoreActionPoint("石が2枚ないため、" + labels.building.CASTLE_WALL + "を建てられません。");
      return;
    }

    state.shared.discard = state.shared.discard.concat(usedStones);
    buildingCard = window.IntoTheMountainState.createBuildingCard(createOwnedBuildingId("CW", "castleWall"), labels.building.CASTLE_WALL);
    state.nextBuildingIds.castleWall += 1;
    addBuilding(buildingCard, defenseBonus, "");
    finishAction(
      activePlayer.name + " が " + labels.building.CASTLE_WALL + "を建てました。防御力が" + defenseBonus + "上がりました。",
      createShortActionText(labels.building.CASTLE_WALL, "建設")
    );
  }

  function buildEvolutionTemple() {
    var activePlayer = getActivePlayer();
    var usedWood;
    var usedIron;
    var buildingCard;

    if (!consumeActionPoint()) {
      return;
    }

    if (hasBuilding(activePlayer, labels.building.EVOLUTION_TEMPLE)) {
      restoreActionPoint(labels.building.EVOLUTION_TEMPLE + "はすでに建っています。");
      return;
    }

    usedWood = takeCards(activePlayer.hand, labels.category.RESOURCE, labels.resource.WOOD, 3);
    usedIron = takeCards(activePlayer.hand, labels.category.RESOURCE, labels.resource.IRON, 1);

    if (!usedWood || !usedIron) {
      restoreActionPoint("木3枚と鉄1枚がないため、" + labels.building.EVOLUTION_TEMPLE + "を建てられません。");
      return;
    }

    state.shared.discard = state.shared.discard.concat(usedWood).concat(usedIron);
    buildingCard = window.IntoTheMountainState.createBuildingCard(createOwnedBuildingId("BT", "evolutionTemple"), labels.building.EVOLUTION_TEMPLE);
    state.nextBuildingIds.evolutionTemple += 1;
    addBuilding(buildingCard, 0, "解");
    finishAction(
      activePlayer.name + " が " + labels.building.EVOLUTION_TEMPLE + "を建てました。鉄の剣などの上位要素が解禁されました。",
      createShortActionText(labels.building.EVOLUTION_TEMPLE, "建設")
    );
  }

  function buildVictoryTemple() {
    var activePlayer = getActivePlayer();
    var usedWood;
    var usedStone;
    var usedIron;
    var buildingCard;

    if (!consumeActionPoint()) {
      return;
    }

    if (!hasBuilding(activePlayer, labels.building.EVOLUTION_TEMPLE)) {
      restoreActionPoint(labels.building.EVOLUTION_TEMPLE + "の建設後でないと、" + labels.building.VICTORY_TEMPLE + "は建てられません。");
      return;
    }

    if (hasBuilding(activePlayer, labels.building.VICTORY_TEMPLE)) {
      restoreActionPoint(labels.building.VICTORY_TEMPLE + "はすでに建っています。");
      return;
    }

    usedWood = takeCards(activePlayer.hand, labels.category.RESOURCE, labels.resource.WOOD, 3);
    usedStone = takeCards(activePlayer.hand, labels.category.RESOURCE, labels.resource.STONE, 2);
    usedIron = takeCards(activePlayer.hand, labels.category.RESOURCE, labels.resource.IRON, 1);

    if (!usedWood || !usedStone || !usedIron) {
      restoreActionPoint("木3枚、石2枚、鉄1枚がないため、" + labels.building.VICTORY_TEMPLE + "を建てられません。");
      return;
    }

    state.shared.discard = state.shared.discard.concat(usedWood).concat(usedStone).concat(usedIron);
    buildingCard = window.IntoTheMountainState.createBuildingCard(createOwnedBuildingId("BV", "victoryTemple"), labels.building.VICTORY_TEMPLE);
    state.nextBuildingIds.victoryTemple += 1;
    addBuilding(buildingCard, 0, "勝");
    finishGame(
      activePlayer.name,
      activePlayer.name + " が " + labels.building.VICTORY_TEMPLE + "を建設しました。勝利です。",
      createShortActionText(labels.building.VICTORY_TEMPLE, "建設")
    );
  }

  function sellResource(resourceName, goldGain) {
    var activePlayer = getActivePlayer();
    var soldCard;

    if (!consumeActionPoint()) {
      return;
    }

    soldCard = takeCard(activePlayer.hand, labels.category.RESOURCE, resourceName);

    if (!soldCard) {
      restoreActionPoint(resourceName + "が手札にないため、売却できません。");
      return;
    }

    state.shared.discard.push(soldCard);
    activePlayer.gold += goldGain;
    finishAction(
      activePlayer.name + " が " + resourceName + "を売却して、金貨" + goldGain + "を獲得しました。",
      createShortActionText(resourceName, "売却")
    );
  }

  function gatherWood() {
    var activePlayer = getActivePlayer();
    var gainedWood;

    if (!consumeActionPoints(2, "行動ポイントが2必要なため、木を獲得できません。")) {
      return;
    }

    gainedWood = window.IntoTheMountainState.createResourceCard(createOwnedResourceId("W", "wood"), labels.resource.WOOD);
    state.nextResourceIds.wood += 1;
    activePlayer.hand.push(gainedWood);
    finishAction(
      activePlayer.name + " が行動ポイントを2消費して木を1枚獲得しました。",
      createShortActionText(labels.resource.WOOD, "獲得")
    );
  }

  function gainResourcesFromField(toolName, resourceName, maxGain) {
    var activePlayer = getActivePlayer();
    var usedTool;
    var gainedCount = 0;
    var gainedCard;
    var actualMaxGain = maxGain;

    if (!consumeActionPoint()) {
      return;
    }

    usedTool = takeCard(activePlayer.hand, labels.category.TOOL, toolName);

    if (!usedTool) {
      restoreActionPoint(toolName + "が手札にないため、使用できません。");
      return;
    }

    if (toolName === labels.tool.WOOD_AXE) {
      actualMaxGain += activePlayer.modifiers.woodAxeWoodBonus;
    }

    while (gainedCount < actualMaxGain) {
      gainedCard = takeCard(state.shared.field, labels.category.RESOURCE, resourceName);

      if (!gainedCard) {
        break;
      }

      activePlayer.hand.push(gainedCard);
      gainedCount += 1;
    }

    state.shared.discard.push(usedTool);

    if (gainedCount === 0) {
      finishAction(
        activePlayer.name + " が " + toolName + "を使用しましたが、場札に" + resourceName + "はありませんでした。",
        createShortActionText(toolName, "使用")
      );
      return;
    }

    finishAction(
      activePlayer.name + " が " + toolName + "を使って、場札から" + resourceName + "を" + gainedCount + "枚獲得しました。",
      createShortActionText(toolName, "使用")
    );
  }

  function hirePersonnel(personnelName) {
    var activePlayer = getActivePlayer();
    var hiredCard;
    var cost = labels.personnelCost[personnelName] || 0;

    if (!consumeActionPoint()) {
      return;
    }

    if (activePlayer.gold < cost) {
      restoreActionPoint(personnelName + "を雇用するには " + cost + "G 必要です。");
      return;
    }

    hiredCard = takeCard(state.shared.field, labels.category.PERSONNEL, personnelName);

    if (!hiredCard) {
      restoreActionPoint(personnelName + "は場札にありません。");
      return;
    }

    activePlayer.gold -= cost;
    activePlayer.personnel.push({
      id: hiredCard.id,
      name: hiredCard.name,
      imagePath: hiredCard.imagePath,
      badgeType: "常駐",
      attackBonus: labels.personnelAttack[personnelName] || 0
    });

    if (personnelName === labels.personnel.LUMBERJACK) {
      activePlayer.modifiers.woodAxeWoodBonus += 1;
      finishAction(
        activePlayer.name + " が " + personnelName + "を雇用しました。以後、木の斧で獲得できる木は4枚になります。",
        createShortActionText(personnelName, "雇用")
      );
      return;
    }

    if (personnelName === labels.personnel.SWORDSMAN) {
      activePlayer.attack += labels.personnelAttack[personnelName] || 0;
      finishAction(
        activePlayer.name + " が " + personnelName + "を雇用しました。攻撃力が" + (labels.personnelAttack[personnelName] || 0) + "上がりました。",
        createShortActionText(personnelName, "雇用")
      );
      return;
    }

    if (personnelName === labels.personnel.SAGE) {
      activePlayer.modifiers.actionPointBonus += 1;
      finishAction(
        activePlayer.name + " が " + personnelName + "を雇用しました。以後、毎ターンの行動ポイントが1増えます。",
        createShortActionText(personnelName, "雇用")
      );
      return;
    }

    finishAction(activePlayer.name + " が " + personnelName + "を雇用しました。", createShortActionText(personnelName, "雇用"));
  }

  function attackOpponent() {
    var activePlayer = getActivePlayer();
    var waitingPlayer = getWaitingPlayer();
    var damage;

    if (!consumeActionPoint()) {
      return;
    }

    damage = Math.max(0, activePlayer.attack - waitingPlayer.defense);

    if (damage > 0) {
      waitingPlayer.health = Math.max(0, waitingPlayer.health - damage);
    }

    if (waitingPlayer.health <= 0) {
      finishGame(
        activePlayer.name,
        activePlayer.name + " の攻撃で " + waitingPlayer.name + " の始まりの国の体力を0にしました。勝利です。",
        createShortActionText("攻撃", "勝利")
      );
      return;
    }

    finishAction(
      activePlayer.name +
        " が攻撃しました。" +
        waitingPlayer.name +
        " の防御力" +
        waitingPlayer.defense +
        " に対して " +
        damage +
        " ダメージを与えました。",
      createShortActionText("攻撃", damage > 0 ? "成功" : "不発")
    );
  }

  function countFieldResource(resourceName) {
    return countCards(state.shared.field, labels.category.RESOURCE, resourceName);
  }

  function cpuCanDealDamage() {
    return Math.max(0, getActivePlayer().attack - getWaitingPlayer().defense) > 0;
  }

  function chooseCpuAction() {
    var activePlayer = getActivePlayer();
    var waitingPlayer = getWaitingPlayer();
    var potentialDamage = Math.max(0, activePlayer.attack - waitingPlayer.defense);

    if (!canAct()) {
      return null;
    }

    if (
      hasBuilding(activePlayer, labels.building.EVOLUTION_TEMPLE)
      && !hasBuilding(activePlayer, labels.building.VICTORY_TEMPLE)
      && countCards(activePlayer.hand, labels.category.RESOURCE, labels.resource.WOOD) >= 3
      && countCards(activePlayer.hand, labels.category.RESOURCE, labels.resource.STONE) >= 2
      && countCards(activePlayer.hand, labels.category.RESOURCE, labels.resource.IRON) >= 1
    ) {
      return buildVictoryTemple;
    }

    if (activePlayer.attack > 0 && potentialDamage >= waitingPlayer.health) {
      return attackOpponent;
    }

    if (
      hasBuilding(activePlayer, labels.building.EVOLUTION_TEMPLE)
      && hasCard(activePlayer.hand, labels.category.RESOURCE, labels.resource.IRON)
    ) {
      return function () {
        craftTool(labels.tool.IRON_SWORD, "IS", "ironSword", labels.resource.IRON);
      };
    }

    if (
      !hasBuilding(activePlayer, labels.building.EVOLUTION_TEMPLE)
      && countCards(activePlayer.hand, labels.category.RESOURCE, labels.resource.WOOD) >= 3
      && countCards(activePlayer.hand, labels.category.RESOURCE, labels.resource.IRON) >= 1
    ) {
      return buildEvolutionTemple;
    }

    if (
      hasCard(state.shared.field, labels.category.PERSONNEL, labels.personnel.LUMBERJACK)
      && activePlayer.gold >= labels.personnelCost[labels.personnel.LUMBERJACK]
      && activePlayer.modifiers.woodAxeWoodBonus < 1
    ) {
      return function () {
        hirePersonnel(labels.personnel.LUMBERJACK);
      };
    }

    if (
      hasCard(state.shared.field, labels.category.PERSONNEL, labels.personnel.SWORDSMAN)
      && activePlayer.gold >= labels.personnelCost[labels.personnel.SWORDSMAN]
      && Math.max(0, activePlayer.attack - waitingPlayer.defense) < waitingPlayer.health
    ) {
      return function () {
        hirePersonnel(labels.personnel.SWORDSMAN);
      };
    }

    if (
      hasCard(state.shared.field, labels.category.PERSONNEL, labels.personnel.SAGE)
      && activePlayer.gold >= labels.personnelCost[labels.personnel.SAGE]
      && activePlayer.modifiers.actionPointBonus < 1
    ) {
      return function () {
        hirePersonnel(labels.personnel.SAGE);
      };
    }

    if (
      hasBuilding(activePlayer, labels.building.EVOLUTION_TEMPLE)
      && !hasBuilding(activePlayer, labels.building.CASTLE_WALL)
      && countCards(activePlayer.hand, labels.category.RESOURCE, labels.resource.STONE) >= 2
      && waitingPlayer.attack > 0
    ) {
      return buildCastleWall;
    }

    if (
      !hasBuilding(activePlayer, labels.building.WOOD_FENCE)
      && countCards(activePlayer.hand, labels.category.RESOURCE, labels.resource.WOOD) >= 2
      && waitingPlayer.attack > 0
    ) {
      return buildWoodFence;
    }

    if (hasCard(activePlayer.hand, labels.category.TOOL, labels.tool.STONE_PICKAXE) && countFieldResource(labels.resource.IRON) > 0) {
      return function () {
        gainResourcesFromField(labels.tool.STONE_PICKAXE, labels.resource.IRON, 1);
      };
    }

    if (hasCard(activePlayer.hand, labels.category.TOOL, labels.tool.WOOD_PICKAXE) && countFieldResource(labels.resource.STONE) > 0) {
      return function () {
        gainResourcesFromField(labels.tool.WOOD_PICKAXE, labels.resource.STONE, 1);
      };
    }

    if (hasCard(activePlayer.hand, labels.category.TOOL, labels.tool.WOOD_AXE) && countFieldResource(labels.resource.WOOD) > 0) {
      return function () {
        gainResourcesFromField(labels.tool.WOOD_AXE, labels.resource.WOOD, 3);
      };
    }

    if (hasCard(activePlayer.hand, labels.category.RESOURCE, labels.resource.STONE)) {
      return function () {
        craftTool(labels.tool.STONE_SWORD, "TS", "stoneSword", labels.resource.STONE);
      };
    }

    if (hasCard(activePlayer.hand, labels.category.RESOURCE, labels.resource.STONE) && countFieldResource(labels.resource.IRON) > 0) {
      return function () {
        craftTool(labels.tool.STONE_PICKAXE, "SP", "stonePickaxe", labels.resource.STONE);
      };
    }

    if (hasCard(activePlayer.hand, labels.category.RESOURCE, labels.resource.WOOD) && countFieldResource(labels.resource.STONE) > 0) {
      return function () {
        craftTool(labels.tool.WOOD_PICKAXE, "TP", "pickaxe", labels.resource.WOOD);
      };
    }

    if (hasCard(activePlayer.hand, labels.category.RESOURCE, labels.resource.WOOD) && countFieldResource(labels.resource.WOOD) > 0) {
      return function () {
        craftTool(labels.tool.WOOD_AXE, "TA", "axe", labels.resource.WOOD);
      };
    }

    if (activePlayer.attack > 0 && cpuCanDealDamage()) {
      return attackOpponent;
    }

    if (hasCard(activePlayer.hand, labels.category.RESOURCE, labels.resource.IRON)) {
      return function () {
        sellResource(labels.resource.IRON, 5);
      };
    }

    if (hasCard(activePlayer.hand, labels.category.RESOURCE, labels.resource.STONE)) {
      return function () {
        sellResource(labels.resource.STONE, 3);
      };
    }

    if (hasCard(activePlayer.hand, labels.category.RESOURCE, labels.resource.WOOD)) {
      return function () {
        sellResource(labels.resource.WOOD, 1);
      };
    }

    if (state.actionPoints >= 2) {
      return gatherWood;
    }

    if (activePlayer.attack > 0) {
      return attackOpponent;
    }

    return null;
  }

  function executeCpuTurn() {
    var action;

    clearCpuTurnTimer();

    if (!isCpuTurn() || !state.started || state.winner) {
      return;
    }

    action = chooseCpuAction();

    if (action) {
      action();
      return;
    }

    endTurn();
  }

  function resetState() {
    hideEventOverlay();
    hideActionToast();
    clearCpuTurnTimer();
    clearSelectedCards();
    closeBuildMenu();
    state = window.IntoTheMountainState.createInitialState();
    syncLabels();
    updateLocalPlayerNames();
    actionLogEntries = [];
    buildActionDefinitions();
    broadcastState();
    render();
  }

  function bindEvents() {
    dom["start-button"].addEventListener("click", startGame);
    dom["reset-button"].addEventListener("click", resetState);
    dom["mode-local-button"].addEventListener("click", function () {
      setPlayMode("local");
    });
    dom["mode-cpu-button"].addEventListener("click", function () {
      setPlayMode("cpu");
    });
    dom["create-match-button"].addEventListener("click", createMatch);
    dom["join-match-button"].addEventListener("click", joinMatch);
    dom["event-overlay"].addEventListener("click", hideEventOverlay);
    dom["build-toggle-button"].addEventListener("click", function () {
      if (!canControlLocalTurn()) {
        return;
      }

      isBuildMenuOpen = !isBuildMenuOpen;
      render();
    });
    dom["self-hand"].addEventListener("click", function (event) {
      var cardElement = event.target.closest("[data-selection-key]");

      if (!cardElement || !canControlLocalTurn()) {
        return;
      }

      if (selectedHandCardKey === cardElement.dataset.selectionKey) {
        clearSelectedHandCard();
      } else {
        selectedHandCardKey = cardElement.dataset.selectionKey;
        clearSelectedFieldCard();
      }

      render();
    });
    dom["shared-field"].addEventListener("click", function (event) {
      var cardElement = event.target.closest("[data-selection-key]");

      if (!cardElement || !canControlLocalTurn()) {
        return;
      }

      if (selectedFieldCardKey === cardElement.dataset.selectionKey) {
        clearSelectedFieldCard();
      } else {
        selectedFieldCardKey = cardElement.dataset.selectionKey;
        clearSelectedHandCard();
      }

      render();
    });

    actionDefinitions.forEach(function (action) {
      dom[action.id].addEventListener("click", action.run);
    });
  }

  cacheDom();
  syncLabels();
  updateLocalPlayerNames();
  buildActionDefinitions();
  bindEvents();
  updateMatchPanel("");
  render();
})();
