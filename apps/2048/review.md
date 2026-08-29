# Review 결과 — 2048 게임

Build 서브에이전트와 별개인 Review 서브에이전트가 `apps/2048/spec.md` 대비 결과물(`index.html`, `style.css`, `game.js`)을 검증했다.

## 검증 방법

1. **정적 코드 분석**: `spec.md` 각 항목을 `index.html` / `style.css` / `game.js`와 항목별로 대조. 이동/병합 로직(`slideAndMergeLine`, 방향별 회전·전치 매핑), 게임오버 판정, 승리 오버레이 1회성, localStorage 키, 이벤트 리스너 중복 여부를 코드 추적으로 검증.
2. **브라우저 실사용 검증(가능함)**: `python -m http.server`로 `md-blog` 루트를 로컬 서빙(포트 8137, 8123 충돌 회피)한 뒤 Claude_Browser 도구로 `apps/2048/index.html`을 직접 열어 다음을 실측:
   - 방향키 입력 → 타일 이동/병합/점수 증가 (2+2 → 4, SCORE/BEST 갱신 확인)
   - "새 게임" 클릭 시 보드/SCORE 리셋, BEST 유지 확인 (스크립트로 여러 턴 플레이 후 검증)
   - `localStorage.getItem('md-blog-2048-best-score')` 값 확인 (키/영속성 일치)
   - 375px(모바일) 뷰포트에서 레이아웃 스크린샷 확인 (잘림/가로스크롤 없음)
   - 합성 `TouchEvent`로 스와이프 임계값(25px) 미만 무시, 임계값 이상 시 방향 이동 확인
   - 자동 반복 방향키 입력(78회)으로 실제 게임오버 오버레이 노출 및 "다시 시작" 버튼 동작 확인
   - `read_console_messages`로 전 과정에서 콘솔 에러 없음 확인
   - 자바스크립트로 의도적 레이스 컨디션(빠른 연속 입력) 재현 — 아래 "발견한 문제" 참고
   - **승리(2048 달성) 오버레이는 실사용으로 직접 재현하지 못함** — 무작위 입력으로 2048 타일까지 도달시키는 것이 비현실적이라 코드 추적(로직 검증)으로만 확인. `hasWonThisGame` 플래그, `overlayVisible` 게이팅, `onContinue()`의 재판정 로직을 정적으로 재확인했으며 다른 상태 전이(게임오버/새게임/계속하기)가 모두 정확히 동작하는 것으로 미루어 이 경로도 정상 동작할 것으로 판단됨.
3. **블로그 본체 무수정 확인**: `git status --porcelain` 결과 `?? apps/`만 출력되어 루트 `index.html`, `post.html`, `css/`, `js/`, `posts/`, `feed.xml` 등 기존 파일은 전혀 손대지 않은 것을 확인.

## spec.md 대비 항목별 대조

| 항목 | 상태 | 비고 |
|---|---|---|
| 4x4 그리드, 시작 시 랜덤 타일 2개(2/4, 90%/10%) | 충족 | `startNewGame()`에서 `spawnTile()` 2회 호출, 확률 `Math.random()<0.9?2:4` |
| 방향키 이동 + `e.preventDefault()` | 충족 | 방향키에 매칭될 때만 `preventDefault()` 호출 |
| 병합 시 값 2배 + 점수 가산 | 충족 | `scoreGain += slot.value` (병합 후 값) |
| 연쇄 병합 방지 (2,2,4→4,4, 재병합 안 됨) | 충족 | `slideAndMergeLine`에서 병합 시 `i+=2`로 다음 병합 대상에서 제외 — 코드/실사용 모두 확인 |
| 실질 변화 있을 때만 새 타일 스폰 | 충족 | 타일 id별 이전/이후 위치 비교로 `moved` 판정, 병합/이동 시 항상 위치가 바뀜을 확인(정지 상태 오검출 없음) |
| 게임오버 판정(빈칸 없음 + 인접 동일값 없음) | 충족 | `isBoardFull()` + `hasAvailableMoves()`(우/하 인접만 검사해 전체 쌍 커버) — 실사용으로 실제 게임오버 노출 확인 |
| 승리 메시지 1회성 + 계속하기 | 충족(코드 검증) | `hasWonThisGame` 플래그로 재노출 방지, `onContinue()`가 계속하기 시점에 이미 게임오버 상태인 경우까지 재판정 |
| 파일 구조/자체 완결(3개 파일, 블로그 미참조) | 충족 | `style.css`가 블로그 palette를 import하지 않고 `:root`에 유사 톤으로 복제 (`--bg`, `--bg-board`는 완전 동일값, 나머지 네온 컬러는 유사 톤) |
| UI 구성(타이틀/SCORE·BEST/새게임/보드/오버레이 2종/하단 안내) | 충족 | 모두 마크업에 존재, 텍스트도 spec과 일치 |
| 반응형 보드(`min(90vw, 420px)`) | 충족 | `style.css`에 정확히 동일 값 사용 |
| 데스크톱 keydown / 모바일 touchstart·touchend, 임계값 20~30px, `touch-action:none` | 충족 | `SWIPE_THRESHOLD=25`(범위 내), `.board { touch-action: none }` 존재, 합성 터치 이벤트로 임계값 미만 무시·이상 시 정상 이동 실측 확인 |
| 두 입력 경로 모두 `move(direction)` 호출 | 충족 | keydown/touchend 핸들러 모두 공통 `move()` 호출 |
| 값 구간별 네온 팔레트, 배경은 어둡게 유지 | 충족 | `.tile-inner` 배경은 항상 `--bg-cell`, 컬러/보더/box-shadow만 값 구간별로 다름 |
| 모노스페이스 폰트, 애니메이션(spawn/merge/slide) | 충족 | `tile-spawn`, `tile-merge-pop`, `transform transition 140ms` 모두 구현 |
| localStorage 키 `md-blog-2048-best-score` | 충족 | 정확히 일치, 실측으로 값 저장/조회 확인 |
| `slideAndMergeLine` 압축→병합→재압축 절차 | 충족 | 코드가 spec 7.3 절차를 그대로 구현 |
| 방향별 회전/전치 매핑(상/하/좌/우) | 충족 | 코드 추적으로 4방향 모두 spec 절차와 일치함을 확인 (up: transpose, down: transpose+reverse+un-reverse+transpose, right: reverse, left: 그대로) |
| 블로그 본체 미수정 | 충족 | `git status --porcelain` 결과 `apps/`만 신규, 그 외 변경 없음 |

**미충족 항목 없음.**

## 발견한 문제와 수정 내역

### [발견 및 수정] 빠른 연속 입력 시 병합되어 사라질 타일이 "유령"처럼 잠깐 남는 시각적 버그 (심각도: 중)

**증상**: 병합된 패자(loser) 타일은 `toRemove=true`로 표시된 채 `REMOVE_DELAY_MS`(170ms) 후 `setTimeout`으로 DOM에서 제거된다. 그런데 `render()`는 `tiles` 배열 전체(제거 대기 중인 타일 포함)를 매번 다시 그리므로, 170ms가 지나기 전에 다음 이동이 들어오면:
- 새 이동의 `getBoardGrid()`는 `toRemove` 타일을 논리 격자에서 제외하므로 점수/이동 계산 자체는 항상 정확했다(로직 버그 아님).
- 하지만 그 패자 타일은 이번 이동에서 갱신되지 않고 병합 시점 좌표에 그대로 남아있다가, 그 칸을 덮고 있던 생존 타일이 다음 이동으로 다른 칸으로 이동해버리면 — 아무것도 덮지 않은 채 잘못된 숫자를 표시하는 "유령 타일"이 최대 170ms간 화면에 노출된다.

**재현**: 브라우저에서 세로로 같은 값 2개(위/아래)가 있는 보드를 만든 뒤 `ArrowUp` → 40ms 후 `ArrowDown`을 연속 실행(예: 화살표 키 반복 입력처럼 170ms보다 빠른 연타)해 DOM을 직접 스냅샷하여 실제로 재현/캡처함:
```
afterDownEarly(수정 전) 예: [{row:"0", col:"0", value:"2", z:"1"}, ...]  // 이미 빈 칸이어야 할 (0,0)에 "2" 유령 타일이 남아있음
```

**수정**: `apps/2048/game.js`
- `move(direction)` 시작부에 `flushPendingRemovals()` 호출을 추가해, 이전 턴에서 아직 제거 대기 중이던 `toRemove` 타일을 새 이동을 계산하기 전에 즉시 DOM/상태에서 정리하도록 함.
- `scheduleRemoval()`이 자신이 스케줄한 타일만 정확히 제거하도록 `toRemove` 플래그 기반의 뭉뚱그린 필터 대신 타일 `id` 목록 기반 필터로 변경(여러 `scheduleRemoval` 호출이 겹칠 때 서로 다른 배치의 타일을 잘못 지우는 것을 방지).

수정 후 동일한 재현 스크립트로 재검증 — `afterDownEarly`에 더 이상 유령 타일이 나타나지 않고, 실제 보드 상태와 정확히 일치하는 타일만 렌더링됨을 확인. 이후 일반 플레이(단일 이동, 게임오버까지 자동 반복 입력 78회, 새 게임/다시 시작)에서도 콘솔 에러 없이 정상 동작 확인.

## 최종 결론

**배포 가능**

spec.md의 모든 항목을 충족하며, 발견된 유일한 문제(빠른 연속 입력 시 유령 타일 노출)는 Review 단계에서 직접 수정하고 재검증을 완료했다. 블로그 본체 파일은 전혀 수정되지 않았다.
