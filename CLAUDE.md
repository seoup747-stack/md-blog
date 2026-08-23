# md-blog

마크다운(.md) 파일을 읽어서 정적 블로그 웹사이트로 변환하는 프로젝트.

## 핵심 제약사항 (반드시 지킬 것)

- **프레임워크 금지**: React/Vue/Svelte 등 어떤 프론트엔드 프레임워크도 사용하지 않는다.
- **빌드 도구 금지**: webpack/vite/npm 빌드 스텝 없이, 정적 서버로 서빙하면 바로 동작해야 한다.
- **순수 HTML + CSS + JavaScript(Vanilla JS)** 만 사용한다. `<script type="module">` 정도의 네이티브 브라우저 기능은 허용된다.
- 외부 CDN 라이브러리(마크다운 파서 등)를 끌어오기보다는, 필요한 기능은 직접 구현하는 것을 기본 원칙으로 한다. 정말 필요하면 단일 파일로 바닥에 두는 것만 검토한다(팀 논의 없이 추가 금지).
- `node_modules`, 패키지 매니저 lockfile이 생기면 안 된다.

## 프로젝트 목표

- 사용자가 `posts/` 폴더에 `.md` 파일을 넣고 `posts/manifest.json`에 등록하면, 별도 빌드 없이 브라우저에서 목록 페이지와 개별 글 페이지로 볼 수 있다.
- 디자인은 **사이버펑크/신스웨이브 네온 테마**로 고정한다 — 검은 배경 + 시안/마젠타/퍼플 네온 컬러 포인트, 글로우 효과. 라이트/다크 토글은 없다(항상 이 테마 하나만 존재).
- **모바일 반응형**: 작은 화면에서도 레이아웃이 깨지지 않고 터치 UI로 잘 보인다.

## 현재 구현 상태

- `posts/manifest.json`에 글 4개 등록됨: `dev-productivity-habits`, `today-i-learned`, `hello-world`, `markdown-cheatsheet`.
- 목록 페이지 검색(제목/요약/태그 + 본문 백그라운드 캐시)·태그 필터·URL 쿼리 동기화(`?tag=`, `?q=`) 구현 완료.
- 상세 페이지 렌더링, 태그 배지, XSS 이스케이프 처리 구현 완료.
- **다크/라이트 토글 없음**: `css/style.css`의 `:root`에 네온 팔레트가 고정값으로 정의되어 있다. 과거에 있던 `js/theme.js`, FOUC 방지 인라인 스크립트, 토글 버튼은 모두 제거됨. 새로 라이트 모드를 요청받기 전까지 다시 추가하지 않는다.
- 목록 페이지는 카드 **그리드 레이아웃**(`repeat(auto-fill, minmax(280px, 1fr))`)이며, 카드마다 시안/마젠타/퍼플 네온을 순환 적용(`nth-child(3n+…)`)해 hover 시 해당 색으로 글로우.
- 코드 문법 강조(`js/highlight.js`) — 현재 `define()` 6회 호출로 `js/ts`, `python`, `bash/sh`, `json`, `css`, `html` 6개 언어 지원. 토큰 색상은 네온 팔레트로 매핑됨(`--code-*` 변수).
- `feed.xml`은 `tools/generate-feed.js`로 수동 생성된 정적 RSS 파일. 글 추가/수정 후 재실행 필요.
- git 저장소 구성됨 (`main` 브랜치, origin과 동기화).
- `README.md`에 로컬 서버 실행 방법 안내(반드시 `python -m http.server` 등 정적 서버로 열 것 — `file://`는 CORS 때문에 동작 안 함).

## 폴더 구조 (실제)

```
md-blog/
├── index.html          # 글 목록(홈) 페이지 — 검색창 + 태그 필터 포함
├── post.html           # 개별 글 상세 페이지 (쿼리 파라미터로 slug 식별)
├── feed.xml            # RSS 2.0 피드 (tools/generate-feed.js로 생성된 결과물)
├── css/
│   └── style.css       # 전체 스타일 (CSS 변수로 라이트/다크 테마 정의)
├── js/
│   ├── main.js         # 목록 페이지 로직 (manifest 로드, 검색, 태그 필터, 카드 렌더링)
│   ├── post.js          # 상세 페이지 로직 (md 파일 fetch → 파싱 → 렌더링, 태그 배지)
│   ├── markdown.js     # 마크다운 → HTML 변환 함수 (직접 구현)
│   └── highlight.js    # 코드 문법 강조 토크나이저 (직접 구현)
├── posts/
│   ├── manifest.json   # 글 목록 메타데이터 ({ "posts": [ {slug, title, date, file, summary, tags}, ... ] })
│   └── *.md             # 실제 글 원본
└── tools/
    └── generate-feed.js # manifest.json → feed.xml 생성 스크립트 (수동 실행, Node)
```

### `manifest.json`이 필요한 이유

브라우저 JS는 보안상 서버 없이 폴더 목록을 읽을 수 없다. 따라서 `posts/` 안에 어떤 글이 있는지 알려주는 `manifest.json`을 두고, 새 글을 추가할 때마다 `posts` 배열에 항목을 추가하는 방식으로 관리한다.

```json
{
  "slug": "새글-슬러그",
  "title": "글 제목",
  "date": "2026-08-23",
  "file": "새글-파일명.md",
  "summary": "목록에 보여줄 한 줄 요약 (선택)",
  "tags": ["태그1", "태그2"]
}
```

(`js/main.js`의 `loadPosts()`는 최상위가 배열이든 `{ posts: [...] }` 형태든 모두 처리하지만, 실제 파일은 `{ "posts": [...] }` 형태를 사용한다.)

## 아키텍처 개념

1. **목록 페이지 (`index.html` + `main.js`)**
   - `posts/manifest.json`을 `fetch`로 읽어온다.
   - 날짜 최신순 정렬 후 카드 그리드 형태로 렌더링 (제목, 날짜, 요약, 태그 배지).
   - **태그 필터**: 전체 글의 `tags`를 모아 칩 버튼으로 렌더링. 클릭 시 `?tag=` 쿼리로 필터링하고 `history.replaceState`로 URL에 반영(새로고침/공유 시 유지).
   - **검색**: 검색창 입력(디바운스)마다 title/summary/tags를 즉시 매칭. 백그라운드로 모든 글의 `.md` 원문을 `fetch`해 `bodyCache`(slug → 소문자 원문)를 채우고, 캐시가 준비되면 본문 텍스트도 검색 대상에 포함한다. 검색어도 `?q=` 쿼리로 반영. 태그 필터와는 AND 조건으로 결합.

2. **상세 페이지 (`post.html` + `post.js`)**
   - URL에서 slug 파라미터를 읽는다 (예: `post.html?slug=hello-world`).
   - manifest에서 해당 slug의 `file` 경로를 찾아 `.md` 파일을 `fetch`.
   - `markdown.js`의 파서로 HTML 문자열 변환 후 DOM에 삽입.
   - 삽입한 결과는 반드시 XSS에 안전하게 처리한다 (사용자 입력이 아니라 직접 작성한 md라도, HTML 이스케이프 후 허용된 태그만 생성하는 방식을 기본으로 한다).
   - 글의 `tags`를 헤더에 배지로 표시하며, 각 배지는 `index.html?tag=...`로 연결된다.
   - **주의**: 글 제목은 `manifest.json`의 `title`이 `<h1>`로 렌더링되므로, `.md` 본문 안에 같은 내용의 최상위 `# 제목`을 다시 넣지 않는다 (제목 중복 방지).

3. **마크다운 파서 (`markdown.js`)**
   - 최소 지원 문법: 제목(`#`~`######`), 굵게/기울임, 링크, 이미지, 코드블록(```), 인라인 코드, 목록(순서/비순서), 인용문(`>`), 수평선, 문단/줄바꿈.
   - 표(table)나 각주 같은 고급 문법은 필요해지면 추가한다 (처음부터 완벽한 CommonMark 구현을 목표로 하지 않는다).
   - 코드펜스의 언어(예: ```js)가 `highlight.js`가 지원하는 언어면 `highlightCode()`로 문법 강조를 적용하고, 지원하지 않으면 이스케이프만 한다.

4. **코드 문법 강조 (`highlight.js`)**
   - 언어별로 comment/string/number/keyword 등을 하나의 결합 정규식(named capture group)으로 스캔해 `<span class="tok-*">`로 감싸는 최소 토크나이저.
   - 지원 언어(현재 6개): `js`/`ts`, `python`, `bash`/`sh`, `json`, `css`, `html`. 새 언어를 추가하려면 `define([...], "...")` 호출을 하나 더 추가하면 된다.

5. **RSS 피드 (`feed.xml` / `tools/generate-feed.js`)**
   - 정적 사이트는 요청 시점에 JS로 RSS를 만들 수 없으므로(리더가 JS를 실행하지 않음), `feed.xml`은 미리 생성해 둔 정적 XML 파일이다.
   - `tools/generate-feed.js`는 사이트 런타임과 무관한 Node 저작 도구로, `posts/manifest.json`을 읽어 `feed.xml`을 재생성한다. 글을 추가/수정할 때마다 `node tools/generate-feed.js`를 수동으로 실행한다.
   - 배포 전에는 스크립트 상단의 `SITE_URL`을 실제 도메인으로 바꿔야 한다.

## 디자인 가이드라인

- **테마**: 사이버펑크/신스웨이브 네온, 라이트 모드 없이 고정. `css/style.css`의 `:root`에 정의된 CSS 커스텀 프로퍼티만 사용한다.
  - `--bg`(딥블랙), `--bg-secondary`/`--bg-elevated`(카드·헤더용 약간 밝은 톤), `--text`(밝은 회백색 본문), `--text-secondary`(무채색 보조 텍스트)
  - 네온 포인트: `--neon-cyan`, `--neon-pink`, `--neon-purple`, `--neon-green`, `--neon-yellow` — 헤딩/링크/hover/포커스 글로우(`text-shadow`, `box-shadow`, `filter: drop-shadow`)에 사용
  - 새 색을 추가할 때도 반드시 `:root` 변수로 선언하고, 하드코딩된 색상값을 컴포넌트 CSS에 직접 쓰지 않는다.
- **글로우 사용 원칙**: 모든 텍스트/보더에 글로우를 남발하지 않는다. 헤딩, 링크 hover, 포커스 상태, 카드 hover처럼 상호작용/강조가 필요한 지점에만 적용해 가독성을 해치지 않는다.
- **타이포그래피**: 본문은 시스템 폰트 스택(`-apple-system, "Segoe UI", "Malgun Gothic", sans-serif` 등) 유지, 코드/메타 정보(날짜, 태그, 검색창)는 모노스페이스 폰트로 터미널 느낌을 준다. 본문(`post-content`) 폭은 `max-width: 720px` 정도로 제한해 가독성 확보. `line-height`는 1.6~1.8.
- **레이아웃**: Flexbox/Grid만으로 구성. 목록 페이지는 `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))` 카드 그리드. 모바일 우선(mobile-first)으로 작성하고 `@media (min-width: 768px)` 등으로 넓은 화면 스타일을 추가하는 방식을 기본으로 한다.
- **반응형 기준점(참고)**: `~480px`(작은 모바일), `768px`(태블릿), `1024px`(데스크톱).
- **접근성**: 네온 텍스트/보더도 배경 대비 WCAG AA 이상을 유지해야 한다(특히 `--text-secondary`처럼 채도 낮은 색은 대비를 확인할 것). 순수 장식 요소(배경 격자 패턴 등)는 낮은 투명도로 본문 가독성을 해치지 않게 유지한다.

## 코딩 컨벤션

- 파일/변수명은 영문 소문자 + 케밥/카멜케이스 관례를 따른다 (`markdown.js`, `parseMarkdown()`).
- 전역 스코프 오염을 피하기 위해 각 JS 파일은 IIFE나 `type="module"` 중 하나로 통일한다.
- 주석은 "왜"를 설명할 때만 남기고, 코드 자체로 읽히게 작성한다.
- 새 기능을 추가하기 전, 이 문서의 제약사항(프레임워크/빌드도구 금지)에 위배되지 않는지 먼저 확인한다.

## 향후 확장 아이디어 (선택 사항, 지금 구현하지 않음)

- 검색어/태그 일치 부분 하이라이트 표시
- 코드 하이라이터 지원 언어 추가 (go, rust, sql 등)
- 페이지네이션 (글이 많아질 경우)
- 표(table)·각주 등 고급 마크다운 문법 지원
