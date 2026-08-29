---
name: webapp-blog
description: md-blog 프로젝트(C:\Users\seoup\OneDrive\바탕 화면\claude_exam\md-blog, GitHub seoup747-stack/md-blog)에서 작업할 때 반드시 사용한다. 사용자가 이 프로젝트에 새 미니 웹앱(게임/도구/에디터 등)을 만들어달라고 하거나, "앱 추가해줘", "~게임 만들어줘", "~에디터 만들어줘"처럼 포트폴리오에 뭔가 새로 추가해달라고 하면 — 스킬 이름을 언급하지 않아도 — 이 스킬을 먼저 로드해 Plan→Build→Review→Embed 절차를 따를 것. 블로그 글 추가/manifest.json 규칙, CLAUDE.md의 제약사항(프레임워크 금지, 네온 테마, apps/ 자체완결 규칙, 서브에이전트 분리 규칙) 확인이 필요할 때도 사용한다.
---

# webapp-blog

md-blog 프로젝트(마크다운 정적 블로그 + 미니 웹앱 포트폴리오) 전용 작업 스킬. 이 문서는 저장소 루트의 `CLAUDE.md`를 실제로 실행 가능한 절차로 풀어쓴 것이다. **CLAUDE.md가 이 스킬보다 더 최신일 수 있으니, 규칙이 상충하면 항상 저장소의 `CLAUDE.md`를 다시 읽고 그쪽을 따른다.**

- 프로젝트 경로: `C:\Users\seoup\OneDrive\바탕 화면\claude_exam\md-blog`
- GitHub: `https://github.com/seoup747-stack/md-blog` (public, `main` 브랜치, 로컬 git 사용자는 `seoup747-stack` / `seoup747@gmail.com`)
- 로컬 정적 서버로만 확인 가능: `python -m http.server`로 `md-blog` 폴더를 서빙 (fetch가 CORS 때문에 `file://`에서는 동작하지 않음)

## 핵심 제약사항

- 프레임워크(React/Vue/Svelte 등) 금지, 빌드 도구(webpack/vite/npm 빌드 스텝) 금지. 순수 HTML/CSS/JavaScript(Vanilla JS)만 사용.
- 외부 CDN 라이브러리보다 직접 구현을 우선한다. `node_modules`/lockfile이 생기면 안 된다.
- 디자인은 **사이버펑크/신스웨이브 네온 테마로 고정** — 검정 배경 + 시안/마젠타/퍼플/그린/옐로우 네온, 글로우 효과. **라이트/다크 토글은 의도적으로 없앤 상태이니 복구하지 않는다.**
- 모바일 반응형 필수.

## 폴더 구조

```
md-blog/
├── index.html          # 글 목록 + 검색 + 태그 필터 + "미니 웹앱" 카드 섹션
├── post.html            # 글 상세 페이지
├── feed.xml             # RSS 2.0 (tools/generate-feed.js로 수동 생성)
├── css/style.css        # 전체 스타일, :root에 네온 팔레트 CSS 변수 정의
├── js/{main,post,markdown,highlight}.js
├── posts/{manifest.json, *.md}
├── tools/generate-feed.js
└── apps/{앱이름}/        # 미니 웹앱 — 앱마다 완전히 자체 완결된 폴더
```

`css/style.css`의 핵심 변수: `--bg`, `--bg-secondary`, `--bg-elevated`, `--text`, `--text-secondary`, `--neon-cyan`, `--neon-pink`, `--neon-purple`, `--neon-green`, `--neon-yellow`.

## 이미 있는 미니 웹앱 (패턴 참고용)

- `apps/2048` — 방향키+터치 스와이프 2048 퍼즐, SCORE/BEST 점수판(localStorage)
- `apps/pixel-editor` — 16x16 캔버스 픽셀 아트 에디터, 팔레트, PNG 내보내기(16배 확대, 투명 배경)

새 웹앱을 만들 때 이 두 폴더의 `style.css`(네온 변수를 자체 `:root`에 복제하는 방식), `spec.md`/`review.md`(분량과 형식 감각)를 참고하면 좋다.

---

## 미니 웹앱 추가 절차 (반드시 이 순서로, 건너뛰지 않는다)

사용자가 새 웹앱을 요청하면 아래 4단계를 **Plan 승인 없이는 다음 단계로 넘어가지 않고** 순서대로 밟는다. 이유: 구현부터 시작하면 방향이 틀렸을 때 되돌리는 비용이 크고, Build/Review를 분리하면 "자기가 짠 코드를 자기가 검증"하는 확증편향을 피할 수 있다.

### 1단계 — Plan

1. `Agent` 도구로 `subagent_type: "Plan"` 서브에이전트를 하나 띄운다. 프롬프트에 반드시 포함할 것:
   - 프로젝트 경로와 "먼저 CLAUDE.md를 읽으라"는 지시
   - 핵심 제약사항 요약(프레임워크 금지, `apps/{이름}/` 자체 완결, 네온 팔레트를 CSS 변수로 복제해서 따를 것, 사용법 안내 문구 필수, 외부 라이브러리 최소화하되 CDN 허용, 모바일 지원)
   - 참고할 기존 앱 경로(`apps/2048`, `apps/pixel-editor`)
   - 사용자의 원래 요청 문장 그대로
   - "구현 코드는 쓰지 말고 `apps/{앱이름}/spec.md`만 작성하라"는 지시. spec.md에는: 앱 개요, 기능 요구사항, 파일 구조, UI 구성, 조작 방식(데스크톱+모바일), 시각 디자인 방향(왜 그렇게 했는지 이유 포함), 상태 관리 방식, 블로그 본체에 영향 없음 명시.
2. **주의**: `Plan` 서브에이전트는 읽기 전용이라 `Write` 도구가 없다 — 파일을 직접 저장하지 못하고 spec.md 전체 내용을 최종 응답 텍스트로 돌려준다. 오케스트레이터(나)가 그 내용을 받아 `Write` 도구로 `apps/{앱이름}/spec.md`에 실제로 저장한다.
3. spec.md 요약을 사용자에게 보여주고 **명시적 승인을 받는다.** ("이대로 진행할까요?") 승인 전에는 절대 Build로 넘어가지 않는다.

### 2단계 — Build

1. `apps/{앱이름}/build-instructions.md`를 작성한다. 내용: 수정 허용 범위(`apps/{앱이름}/*` 신규 생성만), 절대 건드리면 안 되는 파일 목록(루트 index.html/post.html/css/js/posts, 다른 apps/* 폴더, CLAUDE.md/README.md), 참고 문서(spec.md, 기존 앱 패턴), 작업 순서, 완료 보고 형식.
2. `Agent` 도구로 `subagent_type: "general-purpose"` 서브에이전트를 띄워 build-instructions.md와 spec.md를 읽고 구현하게 한다 (Build 전용 에이전트 타입은 없으므로 general-purpose를 쓰되, 지침 파일로 범위를 강하게 제한한다).
3. 완료 후 만든 파일 목록과 spec.md 대비 차이점을 보고받는다.

### 3단계 — Review (Build와 반드시 다른 에이전트 인스턴스)

1. `apps/{앱이름}/review-instructions.md`를 작성한다. 내용: spec.md 대비 항목별 대조, 코드 버그 점검 포인트(좌표 변환, 이벤트 리스너 중복, 경계 조건 등 앱 특성에 맞게), 가능하면 브라우저 도구로 실제 동작 확인, `git status`/`git diff`로 블로그 본체 무변경 확인, **문제 발견 시 Review 에이전트가 직접 고치고** `apps/{앱이름}/review.md`에 검증 방법/충족 항목/발견한 문제와 수정 내역/최종 결론("배포 가능" 또는 "추가 수정 필요")을 기록.
2. 새 `Agent` 호출로 `subagent_type: "general-purpose"` 서브에이전트를 **새로 띄운다** (Build를 수행한 에이전트에게 이어서 시키지 않는다 — 자기 코드를 자기가 검증하면 놓치는 게 생긴다).
3. "추가 수정 필요"로 나오면 문제를 파악해 다시 Build 또는 직접 수정 후 재검증한다.

### 4단계 — Embed + 커밋

1. 나(오케스트레이터)가 직접 루트 `index.html`의 `.apps-section > .app-grid` 안에 새 `<a class="app-card">` 블록을 추가한다 (기존 카드 마크업을 그대로 복사해 제목/설명/`href`/iframe `src`만 바꾸면 된다 — `.app-card`, `.app-preview`, `.app-card-body` CSS는 이미 `css/style.css`에 있으므로 재사용).
2. 브라우저로 최종 확인한다 (아래 "검증 시 주의할 점" 참고).
3. **커밋 전에 반드시 `git fetch origin && git status`로 원격에 새 커밋이 있는지 확인한다.** 이 저장소에는 매일 아침 자동으로 커밋/push하는 클라우드 예약 작업이 있어서, 이걸 건너뛰면 fast-forward가 막히거나 자동 커밋을 덮어쓸 수 있다. 뒤처져 있으면 먼저 `git pull --ff-only`(로컬에 손대지 않은 변경이 있으면 `git stash`로 감쌌다가 pull 후 `git stash pop`).
4. `git add -A && git commit -m "..." && git push`. 커밋 메시지에는 Plan→Build→Review→Embed 사이클을 거쳤다는 점과 Review에서 고친 버그(있다면)를 간단히 남긴다.

## 검증 시 주의할 점 (Browser 도구 사용 시)

- 이 프로젝트를 미리보기할 때 `preview_start({name: "md-blog"})`를 쓴다 (`.claude/launch.json`에 이미 `python -m http.server 8123 --directory md-blog`로 등록되어 있다. 없으면 새로 만든다).
- 같은 탭을 오래 재사용하면 `fetch()` 결과가 브라우저 디스크 캐시에 남아 `manifest.json`이나 `index.html`을 고쳐도 옛날 내용이 계속 보일 수 있다. 확실히 확인하려면 `tabs_create`로 새 탭을 열거나, `fetch(url, {cache:'no-store'})`로 직접 검증한다.
- 이 Browser pane은 종종 `window.innerWidth`/`getBoundingClientRect()`가 전부 0으로 잡히는 상태(pane이 실제로 표시되지 않은 상태)로 시작한다. 좌표 기반 클릭/드래그 테스트가 이상하게 실패하면 먼저 `resize_window`로 구체적인 크기를 지정해 실제 뷰포트를 확보한 뒤 재시도한다. `computer` 도구의 좌표 클릭이 안 먹으면 `element.click()`이나 `dispatchEvent(new MouseEvent(...))`로 직접 검증해도 된다.
- 모바일 확인은 `resize_window({preset:"mobile"})` 후 `scrollWidth === clientWidth`로 가로 스크롤 여부를 확인하고, 끝나면 `preset:"desktop"`으로 되돌린다.

## 웹앱 규칙 (Plan/Build/Review 전 단계에서 지켜야 함)

- `apps/{앱이름}/` 폴더 안에 자체 완결 — 블로그 본체의 HTML/CSS/JS를 `<link>`/`<script src>`로 직접 불러오지 않는다.
- **색상 팔레트는 반드시 따른다**: `css/style.css`의 CSS 변수와 같은 이름·값을 앱 자체 `style.css`의 `:root`에 복제해서 쓴다 (컴포넌트 CSS에 색상값을 직접 하드코딩하지 않는다). 단 그림을 그리는 캔버스/그리드처럼 중립 배경이 필요한 곳은 예외로 둘 수 있다.
- **사용법 안내 문구를 반드시 넣는다** — 화면 하단 등에 조작 방법을 짧게 설명하는 텍스트. 데스크톱/모바일 조작이 다르면 둘 다 안내.
- 외부 라이브러리 사용 최소화(CDN은 허용), 모바일 지원 필수.

---

## 블로그 글 추가 (미니 웹앱이 아니라 글을 추가/수정할 때)

1. `posts/{slug}.md` 작성 — **본문에 최상위 `#` 제목을 넣지 않는다** (제목은 `manifest.json`의 `title`이 `<h1>`로 자동 렌더링되므로, 넣으면 중복 표시됨).
2. `posts/manifest.json`의 `posts` 배열에 항목 추가: `{ "slug", "title", "date", "file", "summary", "tags": [...] }`.
3. `node tools/generate-feed.js`로 `feed.xml` 재생성 (글을 추가/수정할 때마다 수동 실행 필요 — 자동 반영 안 됨).
4. 커밋 전 3단계와 동일하게 `git fetch`로 원격 최신 상태 확인.

## 서브에이전트 공통 규칙

- 서브에이전트에게 넘길 때는 항상 전용 지침 파일(`.md`)을 만들어 전달한다 — 대화로만 지시하면 범위가 흐려지기 쉽다.
- Build와 Review는 반드시 다른 `Agent` 호출(다른 에이전트 인스턴스)이어야 한다.
- 각 서브에이전트는 지침 파일에 명시된 범위 밖의 파일은 건드리지 않는다.
- 서브에이전트가 결과를 다르게 구현했거나 spec을 못 지킨 부분이 있다면, 그 이유를 최종 보고에 포함시키게 하고 오케스트레이터가 검토한다.

## 막히면

승인 없이 구현을 시작하지 않는다. 요구사항이 애매하거나 기존 규칙과 충돌하면 사용자에게 먼저 확인한다 (예: 이전에 다른 세션이 이미 겹치는 작업을 해둔 걸 발견했을 때, 조용히 되돌리거나 덮어쓰지 말고 상황을 설명하고 어떻게 합칠지 물어본다).
