# Independent code review findings

1. **File/section:** `js/markdown.js`, `parseInline()` around lines 20–49  
   **Severity:** high  
   **What's wrong:** Markdown link destinations are copied directly into `href` after HTML escaping, but their URL scheme is never validated. A post containing `[click](javascript:alert(document.domain))` produces a clickable JavaScript URL; because `post.js` inserts the result with `innerHTML`, clicking it executes script in the blog origin. The same lack of URL policy also permits unwanted `data:`/other schemes and unsafe image sources.  
   **Suggested fix:** Parse destinations with `new URL(value, location.href)` and allow only an explicit set of schemes (for example `http:`, `https:`, and optionally `mailto:`), plus safe relative/hash URLs; reject or render invalid destinations as text. Apply a separate, stricter allowlist to image `src` values.

2. **File/section:** `js/markdown.js`, fenced-code handling around lines 102–117  
   **Severity:** high  
   **What's wrong:** The fence language token comes from raw markdown and is interpolated unescaped into a `class` attribute. For example, a fence beginning with ```` ```x"onmouseover="alert(1) ```` creates an event-handler attribute when the generated HTML is assigned to `innerHTML`; moving the pointer over the code block can execute it. This contradicts the file's claim that markdown is always escaped before HTML generation.  
   **Suggested fix:** Normalize language identifiers to a strict allowlist such as `/^[A-Za-z0-9_-]+$/`, and HTML-escape any value used in an attribute (or construct the resulting DOM with element APIs).

3. **File/section:** `js/markdown.js`, `parseInline()` around lines 50–59  
   **Severity:** medium  
   **What's wrong:** Inline code is parsed after emphasis and links. Markdown syntax inside code therefore becomes markup: `` `**not bold**` `` renders a `<strong>` inside `<code>`, and code containing link-like text can become a clickable link. This breaks the expected literal semantics of inline code and makes technical examples render incorrectly.  
   **Suggested fix:** Extract inline-code spans into placeholders before applying any other inline rules, then restore their escaped contents as `<code>` elements afterward.

4. **File/section:** `js/post.js` around line 83; markdown image/link handling in `js/markdown.js`  
   **Severity:** medium  
   **What's wrong:** Markdown files live under `posts/`, but rendered relative URLs are interpreted relative to `post.html` at the repository root. A post containing `![diagram](diagram.png)` next to `posts/diagram.png` requests `/diagram.png`, so otherwise conventional post-local images and links are broken.  
   **Suggested fix:** Resolve relative markdown destinations against the loaded markdown file's directory before rendering, or formally require and document root-relative paths and validate them.

5. **File/section:** `js/main.js` lines 15–22 and 108–110; `js/post.js` lines 11–19; `tools/generate-feed.js` lines 36–39  
   **Severity:** medium  
   **What's wrong:** Date-only manifest values are passed to `new Date("YYYY-MM-DD")`, which JavaScript interprets as midnight UTC. In negative UTC offsets, a post dated `2026-08-29` displays as August 28; sorting and RSS timestamps inherit the same UTC assumption.  
   **Suggested fix:** Parse the three date components explicitly and format them as a calendar date without timezone conversion. For RSS, define the publication timezone intentionally and generate the corresponding RFC 822 timestamp.

6. **File/section:** `tools/generate-feed.js` line 19 and committed `feed.xml` links (for example lines 5 and 11)  
   **Severity:** medium  
   **What's wrong:** The generated and committed RSS feed uses `https://example.com/md-blog`. Subscribers following any item are sent to the placeholder domain rather than this blog, so the advertised RSS feature is unusable after deployment unless someone remembers an undocumented source edit.  
   **Suggested fix:** Set the real canonical deployment URL, or require it as a command-line/environment value and fail generation when it is missing or still uses `example.com`.

7. **File/section:** `js/main.js` lines 7–23 and `js/post.js` lines 3–19  
   **Severity:** low  
   **What's wrong:** `escapeHtml()` and `formatDate()` are duplicated. The copies already have security-sensitive behavior and must be changed together (for example, fixing the date-only timezone bug in just one file would make list and detail pages disagree).  
   **Suggested fix:** Move these helpers into one small shared vanilla-JS file loaded before both page scripts, or expose a single frozen utility namespace.

8. **File/section:** `css/style.css` throughout component rules; `apps/2048/style.css` and `apps/pixel-editor/style.css` `:root` sections  
   **Severity:** low  
   **What's wrong:** The project rule says theme colors must be declared as variables and components should use only those variables, but component rules contain many direct hex/RGBA colors. The mini-app copies have also already drifted from the blog palette (`--neon-cyan` is `#00f0ff` in the blog but `#00e5ff` in both apps; pink, purple, yellow, and text values differ too), so the apps do not actually follow the mandated shared palette.  
   **Suggested fix:** Add semantic variables for translucent borders, glows, selection foregrounds, and similar repeated colors; replace component literals with them, and copy the exact canonical palette values into each self-contained app.

---

## 처리 결과 (Claude가 검증 후 적용)

각 항목을 실제 코드와 대조해 확인한 뒤 아래와 같이 반영했습니다.

- **#1 (javascript: 링크 XSS)** — 확인됨, 수정함. `js/markdown.js`에 `isSafeHref()` 추가 (http/https/mailto/앵커/상대경로만 허용, 그 외 스킴은 링크는 텍스트만 남기고 이미지는 제거).
- **#2 (코드펜스 언어 → class 속성 주입)** — 확인됨, 수정함. 언어 토큰을 `/^[A-Za-z0-9_-]{1,32}$/`로 검증, 통과 못하면 언어 없음으로 취급.
- **#3 (인라인 코드 파싱 순서)** — 확인됨, 수정함. `parseInline()`에서 백틱 코드를 가장 먼저 플레이스홀더로 분리한 뒤 다른 인라인 문법을 적용하고 마지막에 복원하도록 재구성.
- **#4 (상대 경로 이미지가 루트 기준으로 깨짐)** — 확인됨, **범위를 좁혀서** 수정함. 이미지 경로만 `posts/` 기준으로 해석하도록 했고, 링크는 그대로 사이트 루트 기준으로 유지했습니다(기존 글들이 `[글](post.html?slug=...)` 형태로 링크를 쓰고 있어서, 링크까지 posts/ 기준으로 바꾸면 오히려 그게 깨집니다). CLAUDE.md에 이 규칙을 문서화했습니다.
- **#5 (날짜 UTC 자정 해석으로 인한 타임존 하루 밀림)** — `main.js`/`post.js`의 **화면 표시용 `formatDate()`는 확인됨, 수정함** (연/월/일을 직접 분해해 로컬 타임존으로 `Date` 생성). 다만 `tools/generate-feed.js`의 `toRfc822()`는 입력도 출력도 일관되게 UTC라 실제로는 버그가 아니어서 그대로 뒀습니다(주석으로 이유 명시).
- **#6 (RSS가 example.com 플레이스홀더)** — 이미 README에 배포 전 교체 안내가 있던 항목이라 실제 도메인으로 바꾸지는 않았지만(모름), `MD_BLOG_SITE_URL` 환경변수로 덮어쓸 수 있게 하고 생성 시 플레이스홀더면 경고를 출력하도록 개선했습니다.
- **#7 (escapeHtml/formatDate 중복)** — 확인됨, 수정함. `js/utils.js`로 분리해 `main.js`/`post.js`가 공유하도록 변경 (`index.html`/`post.html`에 스크립트 추가).
- **#8 (네온 팔레트 값 드리프트)** — **핵심 부분만** 확인됨, 수정함. 실제로 `apps/2048`, `apps/pixel-editor`의 `--neon-*`/`--text`/`--text-secondary` 값이 블로그 원본과 달라져 있어서 정확히 동일한 값으로 맞췄습니다. "컴포넌트 곳곳의 하드코딩 색상에 시맨틱 변수 추가" 제안은 실제 버그라기보다는 스타일 개선 제안이라 이번엔 적용하지 않았습니다.

모든 수정은 로컬 브라우저(정적 서버)로 직접 재현/재검증했습니다: 안전하지 않은 링크/이미지 스킴 차단, 코드펜스 언어 주입 무력화, 인라인 코드 안 마크다운 미적용, 기존 글(마크다운 문법 예시 글 등) 렌더링 회귀 없음, 두 미니 앱의 `--neon-cyan` 값이 블로그와 동일함을 확인.
