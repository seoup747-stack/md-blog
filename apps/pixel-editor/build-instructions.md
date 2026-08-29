# Build 지침 (픽셀 아트 에디터)

당신은 이 md-blog 프로젝트의 **Build 서브에이전트**입니다. 아래 범위만 수정하세요.

## 수정 허용 범위
- `apps/pixel-editor/index.html` (신규 생성)
- `apps/pixel-editor/style.css` (신규 생성)
- `apps/pixel-editor/editor.js` (신규 생성)

## 절대 건드리면 안 되는 것
- md-blog 루트의 `index.html`, `post.html`, `css/style.css`, `js/*.js`, `posts/*`, `feed.xml`, `CLAUDE.md`, `README.md`, `apps/2048/*` 등 그 외 모든 기존 파일.
- 새 npm 패키지나 빌드 도구, 외부 라이브러리를 추가하지 않는다. 순수 HTML/CSS/JS + Canvas API.

## 참고 문서
- `apps/pixel-editor/spec.md` — 반드시 먼저 전체를 읽고, 명세된 내용을 그대로 구현하세요 (16x16 캔버스 그리드, 팔레트, Draw/Eraser, Clear, PNG 내보내기 방식, 조작 방식, 시각 디자인, 상태 관리).
- `apps/2048/` (index.html/style.css/game.js) — 이전 미니 웹앱 예시. 네온 테마 CSS 변수 복제 방식, IIFE 구조, 터치 이벤트 처리 패턴을 참고하되 그대로 베끼지 말고 이 앱에 맞게 적용하세요.
- 프로젝트 루트 `CLAUDE.md` — 코딩 컨벤션(IIFE로 전역 오염 방지, 주석은 "왜"만) 참고.

## 작업 순서
1. `apps/pixel-editor/index.html` 작성 — 헤더(제목), 팔레트+커스텀 색상 선택+현재 색상/도구 표시, 툴바(Draw/Eraser 토글, Clear, Save PNG 버튼), 캔버스, 하단 조작 안내.
2. `apps/pixel-editor/style.css` 작성 — spec.md 7절대로 네온 테마 UI + 중립 톤 캔버스 배경(체크보드 패턴은 CSS background로 구현 가능: `linear-gradient` 대각 체커 패턴 또는 캔버스 자체에 JS로 그려도 됨 — 편한 방식 선택). 모바일 반응형(`min(90vw, 320px)` 등).
3. `apps/pixel-editor/editor.js` 작성 — spec.md 8절의 상태 관리(16x16 배열), 5절의 마우스/터치 페인팅 로직(중복 도색 스킵 포함), 6절의 PNG 내보내기(16배 확대 임시 캔버스 + `toDataURL` + `<a download>`) 그대로 구현. `image-rendering: pixelated` 적용, 좌표→칸 인덱스 변환 시 `getBoundingClientRect()` 비율 환산 정확히 처리.
4. 다 만든 뒤 `node --check`로 editor.js 문법 검사하고, 스스로 코드를 다시 읽어보며 논리 오류(좌표 계산 실수, 이벤트 리스너 중복 등록, touchmove의 preventDefault가 passive:false 없이 등록되지 않았는지 등)가 없는지 점검하세요.

## 완료 보고
작업이 끝나면 만든 파일 목록과, spec.md 대비 구현하지 못했거나 다르게 구현한 부분이 있다면 그 이유를 최종 응답에 요약하세요.
