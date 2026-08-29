// apps/pixel-editor/editor.js
// IIFE로 전역 오염 방지. 16x16 색상 배열(grid)을 유일한 진실 소스로 두고,
// 화면 캔버스는 "변경된 칸만" 다시 그려 드래그 중 성능/깜빡임 문제를 없앤다 (spec.md 5, 8절).
(function () {
  'use strict';

  var GRID_SIZE = 16;
  var CELL_SIZE = 20; // 화면 편집용 캔버스 실제 해상도 기준 한 칸 크기 (320x320)
  var CHECKER_HALF = CELL_SIZE / 2; // 빈 칸을 2x2 체커로 표현 (spec.md 7절)
  var CHECKER_LIGHT = '#ffffff';
  var CHECKER_DARK = '#e6e6e6';
  var GRID_LINE_COLOR = 'rgba(0, 0, 0, 0.15)';
  var EXPORT_CELL = 16; // PNG 내보내기 시 한 칸을 16px 블록으로 확대 (spec.md 6절)

  var canvas, ctx;
  var paletteEl, paletteButtons;
  var customColorInput;
  var currentSwatchEl, currentColorHexEl, currentToolLabelEl;
  var drawToolBtn, eraserToolBtn, clearBtn, saveBtn;

  // 그리드 상태: 길이 256, 각 원소는 hex 색상 문자열 또는 빈 칸을 의미하는 null.
  var grid = new Array(GRID_SIZE * GRID_SIZE).fill(null);

  var currentColor = '#000000';
  var currentTool = 'draw'; // 'draw' | 'eraser'

  var isPainting = false;
  var lastPaintedIndex = -1; // 드래그 중 동일 칸 중복 도색을 막기 위한 기준

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    canvas = document.getElementById('pixel-canvas');
    ctx = canvas.getContext('2d');

    paletteEl = document.getElementById('palette');
    paletteButtons = Array.prototype.slice.call(paletteEl.querySelectorAll('.palette-swatch'));
    customColorInput = document.getElementById('custom-color');

    currentSwatchEl = document.getElementById('current-swatch');
    currentColorHexEl = document.getElementById('current-color-hex');
    currentToolLabelEl = document.getElementById('current-tool-label');

    drawToolBtn = document.getElementById('draw-tool-btn');
    eraserToolBtn = document.getElementById('eraser-tool-btn');
    clearBtn = document.getElementById('clear-btn');
    saveBtn = document.getElementById('save-btn');

    attachPaletteHandlers();
    attachToolbarHandlers();
    attachCanvasInputHandlers();

    // 첫 스와치(검정)를 기본 선택 상태로 표시.
    selectPaletteColor(currentColor, paletteButtons[0]);
    updateIndicator();
    renderAll();
  }

  // ---- 팔레트/커스텀 색상 ----

  function attachPaletteHandlers() {
    paletteButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectPaletteColor(btn.getAttribute('data-color'), btn);
      });
    });

    customColorInput.addEventListener('input', function () {
      currentColor = customColorInput.value;
      clearPaletteSelection();
      updateIndicator();
    });
  }

  function selectPaletteColor(color, btnEl) {
    currentColor = color;
    clearPaletteSelection();
    if (btnEl) btnEl.classList.add('selected');
    customColorInput.value = color;
    updateIndicator();
  }

  function clearPaletteSelection() {
    paletteButtons.forEach(function (btn) {
      btn.classList.remove('selected');
    });
  }

  // ---- 툴바 ----

  function attachToolbarHandlers() {
    drawToolBtn.addEventListener('click', function () {
      setTool('draw');
    });
    eraserToolBtn.addEventListener('click', function () {
      setTool('eraser');
    });
    clearBtn.addEventListener('click', handleClear);
    saveBtn.addEventListener('click', exportPNG);
  }

  function setTool(tool) {
    currentTool = tool;
    drawToolBtn.classList.toggle('active', tool === 'draw');
    eraserToolBtn.classList.toggle('active', tool === 'eraser');
    updateIndicator();
  }

  function handleClear() {
    if (!confirm('전체 그림을 지우시겠습니까?')) return;
    for (var i = 0; i < grid.length; i++) grid[i] = null;
    renderAll();
  }

  function updateIndicator() {
    currentSwatchEl.style.backgroundColor = currentColor;
    currentColorHexEl.textContent = currentColor.toUpperCase();
    currentToolLabelEl.textContent = currentTool === 'draw' ? 'DRAW' : 'ERASER';
  }

  // ---- 캔버스 입력 처리 (spec.md 5절) ----

  function attachCanvasInputHandlers() {
    canvas.addEventListener('mousedown', function (e) {
      isPainting = true;
      lastPaintedIndex = -1;
      paintCellAt(e.clientX, e.clientY);
    });

    canvas.addEventListener('mousemove', function (e) {
      if (!isPainting) return;
      paintCellAt(e.clientX, e.clientY);
    });

    canvas.addEventListener('mouseup', function () {
      isPainting = false;
    });

    // 캔버스 밖으로 나가면 드래그를 종료해, 밖에서 버튼을 뗐다가 다시 들어와도
    // 중간 구간이 잘못 이어 칠해지지 않게 한다.
    canvas.addEventListener('mouseleave', function () {
      isPainting = false;
    });

    // 캔버스 밖에서 마우스 버튼을 떼는 경우까지 확실히 커버.
    document.addEventListener('mouseup', function () {
      isPainting = false;
    });

    canvas.addEventListener('touchstart', function (e) {
      if (!e.touches.length) return;
      isPainting = true;
      lastPaintedIndex = -1;
      var touch = e.touches[0];
      paintCellAt(touch.clientX, touch.clientY);
    }, { passive: false });

    canvas.addEventListener('touchmove', function (e) {
      // 스크롤/핀치줌 제스처와 충돌하지 않도록 반드시 preventDefault를 호출한다.
      // { passive: false }로 등록해야 preventDefault가 실제로 동작한다.
      e.preventDefault();
      if (!isPainting || !e.touches.length) return;
      var touch = e.touches[0];
      paintCellAt(touch.clientX, touch.clientY);
    }, { passive: false });

    canvas.addEventListener('touchend', function () {
      isPainting = false;
    });

    canvas.addEventListener('touchcancel', function () {
      isPainting = false;
    });
  }

  // 데스크톱/모바일 두 입력 경로가 공유하는 유일한 좌표 변환 + 도색 진입점.
  function paintCellAt(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var x = (clientX - rect.left) * scaleX;
    var y = (clientY - rect.top) * scaleY;

    var col = Math.floor(x / CELL_SIZE);
    var row = Math.floor(y / CELL_SIZE);
    if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) return;

    var index = row * GRID_SIZE + col;
    if (index === lastPaintedIndex) return; // 직전에 칠한 칸과 같으면 스킵 (중복 도색 방지)
    lastPaintedIndex = index;

    var newValue = currentTool === 'eraser' ? null : currentColor;
    grid[index] = newValue;
    drawCell(index);
  }

  // ---- 렌더링 ----

  function renderAll() {
    for (var i = 0; i < grid.length; i++) drawCell(i);
  }

  // 변경된 칸 하나만 다시 그린다 (spec.md 8절 렌더링 원칙).
  function drawCell(index) {
    var col = index % GRID_SIZE;
    var row = Math.floor(index / GRID_SIZE);
    var x = col * CELL_SIZE;
    var y = row * CELL_SIZE;
    var color = grid[index];

    if (color) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    } else {
      drawCheckerCell(x, y);
    }

    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
  }

  // 빈 칸은 흰색/회색 2x2 체커로 그려 "투명"임을 시각적으로 나타낸다 (spec.md 7절).
  // 전역 픽셀 좌표 기준으로 명암을 판정해, 칸 전체에 걸쳐 체커 패턴이 자연스럽게 이어지게 한다.
  function drawCheckerCell(x, y) {
    for (var sy = 0; sy < 2; sy++) {
      for (var sx = 0; sx < 2; sx++) {
        var px = x + sx * CHECKER_HALF;
        var py = y + sy * CHECKER_HALF;
        var checkX = Math.floor(px / CHECKER_HALF);
        var checkY = Math.floor(py / CHECKER_HALF);
        var isLight = (checkX + checkY) % 2 === 0;
        ctx.fillStyle = isLight ? CHECKER_LIGHT : CHECKER_DARK;
        ctx.fillRect(px, py, CHECKER_HALF, CHECKER_HALF);
      }
    }
  }

  // ---- PNG 내보내기 (spec.md 6절) ----

  function exportPNG() {
    var exportSize = GRID_SIZE * EXPORT_CELL; // 256
    var tempCanvas = document.createElement('canvas');
    tempCanvas.width = exportSize;
    tempCanvas.height = exportSize;

    var tctx = tempCanvas.getContext('2d');
    tctx.imageSmoothingEnabled = false; // 확대 시 보간 방지 → 또렷한 픽셀 경계 유지

    for (var row = 0; row < GRID_SIZE; row++) {
      for (var col = 0; col < GRID_SIZE; col++) {
        var color = grid[row * GRID_SIZE + col];
        if (!color) continue; // 빈 칸은 그리지 않는다 → 그대로 투명(alpha=0)으로 남는다.
        tctx.fillStyle = color;
        tctx.fillRect(col * EXPORT_CELL, row * EXPORT_CELL, EXPORT_CELL, EXPORT_CELL);
      }
    }

    var dataUrl = tempCanvas.toDataURL('image/png');
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'pixel-art.png';
    a.click();
    // DOM에 삽입한 적이 없으므로 별도 제거 없이 참조만 놓아 GC에 맡긴다.
  }
})();
