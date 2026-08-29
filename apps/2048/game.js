// apps/2048/game.js
// IIFE로 전역 오염 방지. 로직용 상태(board 격자)와 렌더링용 상태(tiles 리스트)를 분리해
// 슬라이드/병합 애니메이션이 자연스럽게 이어지도록 한다 (spec.md 7절).
(function () {
  'use strict';

  var SIZE = 4;
  var STORAGE_KEY = 'md-blog-2048-best-score';
  // CSS의 --tile-transition(140ms)보다 살짝 여유를 두고 DOM에서 제거한다.
  var REMOVE_DELAY_MS = 170;
  var SWIPE_THRESHOLD = 25;

  var boardEl, tileLayerEl, scoreEl, bestEl, finalScoreEl;
  var newGameBtn, retryBtn, continueBtn, winNewGameBtn;
  var gameOverOverlay, winOverlay;

  // 렌더링용 상태: 각 타일을 {id, row, col, value, el, isNew, justMerged, toRemove}로 추적.
  var tiles = [];
  var nextTileId = 1;

  // 로직용 상태
  var score = 0;
  var bestScore = 0;
  var hasWonThisGame = false;
  var isGameOver = false;
  var overlayVisible = false;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    boardEl = document.getElementById('board');
    tileLayerEl = document.getElementById('tile-layer');
    scoreEl = document.getElementById('score');
    bestEl = document.getElementById('best');
    finalScoreEl = document.getElementById('final-score');
    newGameBtn = document.getElementById('new-game-btn');
    retryBtn = document.getElementById('retry-btn');
    continueBtn = document.getElementById('continue-btn');
    winNewGameBtn = document.getElementById('win-new-game-btn');
    gameOverOverlay = document.getElementById('game-over-overlay');
    winOverlay = document.getElementById('win-overlay');

    loadBestScore();
    attachInputHandlers();

    newGameBtn.addEventListener('click', startNewGame);
    retryBtn.addEventListener('click', startNewGame);
    winNewGameBtn.addEventListener('click', startNewGame);
    continueBtn.addEventListener('click', onContinue);

    startNewGame();
  }

  // ---- 입력 처리 ----

  function attachInputHandlers() {
    var KEY_TO_DIR = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right'
    };

    document.addEventListener('keydown', function (e) {
      var dir = KEY_TO_DIR[e.key];
      if (!dir) return;
      e.preventDefault();
      move(dir);
    });

    var touchStartX = 0;
    var touchStartY = 0;
    var touchActive = false;

    boardEl.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      touchActive = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    boardEl.addEventListener('touchend', function (e) {
      if (!touchActive) return;
      touchActive = false;
      var touch = e.changedTouches[0];
      var deltaX = touch.clientX - touchStartX;
      var deltaY = touch.clientY - touchStartY;
      var absX = Math.abs(deltaX);
      var absY = Math.abs(deltaY);

      if (Math.max(absX, absY) < SWIPE_THRESHOLD) return; // 탭으로 간주, 무시

      if (absX > absY) {
        move(deltaX > 0 ? 'right' : 'left');
      } else {
        move(deltaY > 0 ? 'down' : 'up');
      }
    });
  }

  // ---- 게임 시작/리셋 ----

  function startNewGame() {
    tiles.forEach(function (t) {
      if (t.el && t.el.parentNode) t.el.parentNode.removeChild(t.el);
    });
    tiles = [];
    score = 0;
    hasWonThisGame = false;
    isGameOver = false;
    overlayVisible = false;

    hideOverlay(gameOverOverlay);
    hideOverlay(winOverlay);

    updateScoreDisplay();

    spawnTile();
    spawnTile();
    render();
  }

  function onContinue() {
    hideOverlay(winOverlay);
    overlayVisible = false;
    // 승리와 동시에 더 이상 이동 불가능한 상태였을 수 있으므로 재확인한다.
    if (isBoardFull() && !hasAvailableMoves()) {
      isGameOver = true;
      overlayVisible = true;
      showGameOverOverlay();
    }
  }

  // ---- 보드 격자 유틸 ----

  function createEmptyGrid() {
    var grid = [];
    for (var r = 0; r < SIZE; r++) {
      grid.push([null, null, null, null]);
    }
    return grid;
  }

  function getBoardGrid() {
    var grid = createEmptyGrid();
    tiles.forEach(function (t) {
      if (!t.toRemove) grid[t.row][t.col] = t;
    });
    return grid;
  }

  function getEmptyCells(grid) {
    var cells = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (grid[r][c] === null) cells.push({ row: r, col: c });
      }
    }
    return cells;
  }

  function transpose(grid) {
    var t = createEmptyGrid();
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        t[c][r] = grid[r][c];
      }
    }
    return t;
  }

  function reverseRows(grid) {
    return grid.map(function (row) {
      return row.slice().reverse();
    });
  }

  // ---- 타일 생성 ----

  function spawnTile() {
    var grid = getBoardGrid();
    var empties = getEmptyCells(grid);
    if (!empties.length) return false;

    var pos = empties[Math.floor(Math.random() * empties.length)];
    var value = Math.random() < 0.9 ? 2 : 4;

    tiles.push({
      id: nextTileId++,
      row: pos.row,
      col: pos.col,
      value: value,
      isNew: true,
      justMerged: false,
      toRemove: false,
      el: null
    });
    return true;
  }

  // ---- 이동/병합 핵심 로직 (spec.md 7.3) ----

  // line: 길이 4의 배열, 각 원소는 타일 참조 또는 null. 왼쪽으로 미는 기준.
  // 1) 압축 -> 2) 인접 동일값 병합(1회 한정) -> 3) 재압축(길이 4로 패딩).
  function slideAndMergeLine(line) {
    var compact = line.filter(function (t) { return t !== null; });
    var slots = [];
    var i = 0;

    while (i < compact.length) {
      var current = compact[i];
      var next = compact[i + 1];
      if (next && next.value === current.value) {
        slots.push({ survivor: current, loser: next, value: current.value * 2 });
        i += 2; // 병합된 결과는 같은 턴에 다시 병합 대상이 되지 않는다.
      } else {
        slots.push({ survivor: current, loser: null, value: current.value });
        i += 1;
      }
    }

    while (slots.length < SIZE) slots.push(null);
    return slots;
  }

  function move(direction) {
    if (isGameOver || overlayVisible) return;

    // 이전 이동에서 병합되어 사라질 예정이던(toRemove) 타일이 아직 setTimeout으로
    // 제거되기 전(REMOVE_DELAY_MS 이내)에 다음 이동이 들어올 수 있다. 그 타일은
    // 이번 이동의 grid 계산에서는 제외되지만, render()는 tiles 배열 전체를 순회하므로
    // 그대로 두면 새로 비워진 칸에 값이 잘못 남아있는 "유령 타일"로 잠깐 보일 수 있다.
    // 새 이동을 계산하기 전에 즉시 정리해 그런 잔상이 나타나지 않게 한다.
    flushPendingRemovals();

    var grid = getBoardGrid();
    var work = grid;

    // 방향별 매핑: 회전/전치 후 slideAndMergeLine 하나로 4방향 모두 처리.
    if (direction === 'up') {
      work = transpose(grid);
    } else if (direction === 'down') {
      work = reverseRows(transpose(grid));
    } else if (direction === 'right') {
      work = reverseRows(grid);
    }
    // left는 그대로 사용.

    var processed = work.map(slideAndMergeLine);

    var finalGrid;
    if (direction === 'up') {
      finalGrid = transpose(processed);
    } else if (direction === 'down') {
      finalGrid = transpose(reverseRows(processed));
    } else if (direction === 'right') {
      finalGrid = reverseRows(processed);
    } else {
      finalGrid = processed;
    }

    var prevPositions = {};
    tiles.forEach(function (t) {
      if (!t.toRemove) prevPositions[t.id] = { row: t.row, col: t.col };
    });

    // 새 이동을 적용하기 전 이전 턴의 일시적 애니메이션 플래그를 초기화한다.
    tiles.forEach(function (t) {
      t.isNew = false;
      t.justMerged = false;
    });

    var scoreGain = 0;

    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var slot = finalGrid[r][c];
        if (!slot) continue;

        slot.survivor.row = r;
        slot.survivor.col = c;
        slot.survivor.value = slot.value;

        if (slot.loser) {
          slot.loser.row = r;
          slot.loser.col = c;
          slot.loser.toRemove = true;
          slot.survivor.justMerged = true;
          scoreGain += slot.value;
        }
      }
    }

    var moved = tiles.some(function (t) {
      var prev = prevPositions[t.id];
      return prev && (prev.row !== t.row || prev.col !== t.col);
    });

    if (!moved) return; // 막힌 방향: 아무 일도 일어나지 않는다.

    score += scoreGain;
    if (score > bestScore) {
      bestScore = score;
      saveBestScore();
    }
    updateScoreDisplay();

    spawnTile();
    render();
    scheduleRemoval();
    checkGameState();
  }

  function scheduleRemoval() {
    var toRemoveTiles = tiles.filter(function (t) { return t.toRemove; });
    if (!toRemoveTiles.length) return;

    // id로 정확히 이 호출이 스케줄한 타일만 제거한다. 만약 다음 이동이 먼저
    // flushPendingRemovals()로 이 타일들을 정리해버렸다면 el.parentNode가 이미
    // null이므로 안전하게 스킵되고, tiles 배열 필터도 무해하다(이미 없음).
    var idsToRemove = toRemoveTiles.map(function (t) { return t.id; });

    setTimeout(function () {
      toRemoveTiles.forEach(function (t) {
        if (t.el && t.el.parentNode) t.el.parentNode.removeChild(t.el);
      });
      tiles = tiles.filter(function (t) { return idsToRemove.indexOf(t.id) === -1; });
    }, REMOVE_DELAY_MS);
  }

  // 병합되어 사라질 예정인(toRemove) 타일을 지금 즉시 DOM/상태에서 제거한다.
  // 다음 이동을 계산하기 전에 호출해, 아직 안 지워진 이전 턴의 잔상이
  // 이번 이동으로 비워진 칸에 유령처럼 남아 보이는 것을 방지한다.
  function flushPendingRemovals() {
    var stale = tiles.filter(function (t) { return t.toRemove; });
    if (!stale.length) return;

    stale.forEach(function (t) {
      if (t.el && t.el.parentNode) t.el.parentNode.removeChild(t.el);
    });
    tiles = tiles.filter(function (t) { return !t.toRemove; });
  }

  // ---- 게임오버/승리 판정 (spec.md 7.4) ----

  function isBoardFull() {
    var grid = getBoardGrid();
    return grid.every(function (row) {
      return row.every(function (cell) { return cell !== null; });
    });
  }

  function hasAvailableMoves() {
    var grid = getBoardGrid();
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var cell = grid[r][c];
        var value = cell ? cell.value : 0;
        var right = c < SIZE - 1 ? grid[r][c + 1] : null;
        var down = r < SIZE - 1 ? grid[r + 1][c] : null;
        if (right && right.value === value) return true;
        if (down && down.value === value) return true;
      }
    }
    return false;
  }

  function checkGameState() {
    if (!hasWonThisGame) {
      var reached2048 = tiles.some(function (t) { return !t.toRemove && t.value >= 2048; });
      if (reached2048) {
        hasWonThisGame = true;
        overlayVisible = true;
        showWinOverlay();
        return;
      }
    }

    if (isBoardFull() && !hasAvailableMoves()) {
      isGameOver = true;
      overlayVisible = true;
      showGameOverOverlay();
    }
  }

  function showWinOverlay() {
    winOverlay.style.display = 'flex';
  }

  function showGameOverOverlay() {
    finalScoreEl.textContent = String(score);
    gameOverOverlay.style.display = 'flex';
  }

  function hideOverlay(el) {
    el.style.display = 'none';
  }

  // ---- 렌더링 ----

  function tileValueClass(value) {
    if (value >= 2048) return 'tile-super';
    return 'tile-' + value;
  }

  function render() {
    tiles.forEach(function (t) {
      if (!t.el) {
        t.el = document.createElement('div');
        t.el.className = 'tile';
        var innerNew = document.createElement('div');
        innerNew.className = 'tile-inner';
        t.el.appendChild(innerNew);
        tileLayerEl.appendChild(t.el);
      }

      var inner = t.el.firstChild;

      t.el.style.setProperty('--row', t.row);
      t.el.style.setProperty('--col', t.col);
      t.el.style.zIndex = t.toRemove ? '1' : (t.justMerged ? '10' : '5');

      inner.textContent = String(t.value);
      inner.className = 'tile-inner ' + tileValueClass(t.value);

      if (t.isNew) {
        // 클래스를 제거→재추가(강제 리플로우)해 애니메이션을 확실히 재생한다.
        inner.classList.remove('spawn');
        void inner.offsetWidth;
        inner.classList.add('spawn');
      }
      if (t.justMerged) {
        inner.classList.remove('merge');
        void inner.offsetWidth;
        inner.classList.add('merge');
      }
    });
  }

  // ---- 점수/localStorage ----

  function updateScoreDisplay() {
    scoreEl.textContent = String(score);
    bestEl.textContent = String(bestScore);
  }

  function loadBestScore() {
    var stored = 0;
    try {
      stored = parseInt(localStorage.getItem(STORAGE_KEY), 10);
    } catch (e) {
      stored = 0;
    }
    bestScore = isNaN(stored) ? 0 : stored;
  }

  function saveBestScore() {
    try {
      localStorage.setItem(STORAGE_KEY, String(bestScore));
    } catch (e) {
      // localStorage 사용 불가 환경(프라이빗 모드 등)에서는 조용히 무시한다.
    }
  }
})();
