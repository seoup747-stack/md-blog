---
name: webapp-harmess
description: md-blog 프로젝트(C:\Users\seoup\OneDrive\바탕 화면\claude_exam\md-blog, GitHub seoup747-stack/md-blog)의 기술 스택·환경·권한 설정을 확인하거나, 외부 도구(OpenAI Codex CLI)로 이 프로젝트 코드를 리뷰받을 때 반드시 사용한다. 사용자가 "코덱스로 리뷰해줘", "codex 돌려줘", "외부 관점/두 번째 의견으로 검토해줘"처럼 요청하거나, codex 실행 중 샌드박스/권한 오류를 마주쳤을 때, 또는 이 프로젝트가 어떤 언어·도구로 되어 있는지 확인이 필요할 때 — 스킬 이름을 언급하지 않아도 — 이 스킬을 먼저 로드할 것. 미니 웹앱을 새로 만드는 Plan/Build/Review/Embed 워크플로우 자체는 별도의 `webapp-blog` 스킬을 대신 참고한다.
---

# webapp-harmess

md-blog 프로젝트가 실제로 어떤 스택 위에서, 어떤 권한으로 돌아가는지, 그리고 OpenAI Codex CLI를 "외부 검토자"로 불러 코드 리뷰를 받는 절차를 정리한 스킬. 새 미니 웹앱을 만드는 Plan→Build→Review→Embed 절차 자체는 `webapp-blog` 스킬에 있으니 그쪽을 본다.

## 기술 스택

- **프론트엔드**: 순수 HTML + CSS + JavaScript(Vanilla JS). 프레임워크(React/Vue/Svelte 등)와 빌드 도구(webpack/vite 등) 금지 — 브라우저가 그대로 실행할 수 있는 파일만 커밋한다.
- **로컬 실행**: `python -m http.server`로 정적 서빙 (`fetch()`가 `file://`에서는 CORS로 막히기 때문). `.claude/launch.json`에 `md-blog` 프리뷰 설정 등록되어 있음.
- **저작 도구(사이트 런타임과 무관, Node 필요)**: `tools/generate-feed.js` — `posts/manifest.json` → `feed.xml` 생성. CLAUDE.md의 "빌드 도구 금지"는 사이트 자체 구동 방식에 대한 제약이라, 이런 선택적 스크립트는 예외.
- **버전 관리**: Git, GitHub `seoup747-stack/md-blog` (public, `main` 브랜치). 로컬 git 사용자: `seoup747-stack` / `seoup747@gmail.com`.
- **자동화**: 클라우드 예약 작업이 매일 KST 08:00에 이 저장소에 커밋/push함 (`posts/*.md`, `manifest.json`, `feed.xml`만 건드리는 범위로 제한됨). **커밋 전엔 항상 `git fetch origin && git status`로 충돌 여부 확인** — 안 하면 이 자동 커밋과 어긋날 수 있다.
- **외부 검토 도구**: OpenAI Codex CLI (`codex-cli`, 이 머신에 npm 전역 설치됨, `%APPDATA%\npm\codex`). ChatGPT OAuth로 로그인되어 있고, `~/.codex/config.toml`엔 모델 오버라이드가 없어 계정 기본 모델(`gpt-5.6-sol` 등, 계정 상황에 따라 바뀔 수 있음)을 그대로 쓴다.

## CLAUDE.md 핵심 규칙 (요약)

전체 내용은 저장소의 `CLAUDE.md`를 항상 다시 읽을 것 — 계속 갱신된다. 핵심만 요약하면:

- 프레임워크·빌드 도구 금지, 순수 HTML/CSS/JS만.
- 디자인은 사이버펑크/신스웨이브 네온 테마로 고정(라이트/다크 토글 없음 — 의도적으로 없앤 상태).
- 미니 웹앱은 `apps/{이름}/`에 자체 완결, 블로그의 네온 팔레트를 CSS 변수로 복제해서 따르고, 사용법 안내 문구를 반드시 포함.
- 블로그 글은 `posts/manifest.json`에 등록, 본문에 최상위 `#` 제목 금지(제목 중복 방지), 이미지 상대경로는 `posts/` 기준·링크는 사이트 루트 기준.

## Codex 평가(리뷰) 루프

사용자가 "코덱스로 리뷰해줘" 류의 요청을 하면 아래 순서로 진행한다. 이유: Claude 혼자 자기 코드를 검증하면 놓치는 게 있을 수 있으니, 완전히 다른 모델의 시선을 한 번 더 거치는 게 목적이다 — 그래서 Codex가 찾은 지적을 **무조건 반영하지 말고, 실제 코드와 대조해서 확인된 것만** 고친다 (Codex도 틀릴 수 있다).

### 1. 리뷰 프롬프트 작성

임시 파일(예: 스크래치패드)에 프롬프트를 적는다. 반드시 포함할 것:
- 프로젝트 성격(프레임워크 없는 정적 블로그 + 미니 웹앱)과 CLAUDE.md를 먼저 읽으라는 지시.
- 이미 있는 리뷰 파일(예: `apps/2048/review.md`, `apps/pixel-editor/review.md`, 이전 `gemini-review.md`)을 참고해서 **같은 걸 또 지적하지 말고 새로운 문제**를 찾으라는 지시.
- 검토 범위(정확성 버그, 보안, 중복/단순화, CLAUDE.md 규칙 위반, 반응형 문제 등).
- **읽기 전용** — 파일 수정 금지, 결과만 저장소 루트의 지정된 `.md` 파일(사용자가 요청한 파일명, 없으면 `gemini-review.md`)에 작성하라는 지시.
- 각 지적은 파일/위치, 심각도, 구체적 실패 시나리오, 제안 수정을 포함하는 형식으로 요청.

### 2. Codex 실행 — 반드시 아래 정확한 방식으로

```bash
cat "<프롬프트파일 경로>" | codex exec -C "C:\Users\seoup\OneDrive\바탕 화면\claude_exam\md-blog" --dangerously-bypass-approvals-and-sandbox -
```

**이렇게 써야 하는 이유(직접 겪은 문제들)**:
- `codex exec`에 `--sandbox workspace-write`를 줘도, 이 Windows 환경에서는 배너에 `sandbox: read-only`로 뜨면서 `Get-Content`/`dir` 같은 **읽기 전용 명령조차 "policy 위반"으로 거부**된다. 즉 workspace-write는 사실상 동작하지 않는다.
- 그래서 실제로 파일을 읽고 쓰게 하려면 `--dangerously-bypass-approvals-and-sandbox`가 필요하다. 이름 그대로 위험한 옵션이지만, 사용자 소유의 로컬 저장소를 읽고 검토 파일 하나만 쓰는 read-mostly 작업이라는 전제하에 쓴다 — 임의의 신뢰 안 되는 원격 코드를 돌리는 용도로 쓰지 않는다.
- `--ask-for-approval`은 **top-level `codex` 명령에만 있는 옵션이고 `codex exec`에는 없다** — `codex exec ... --ask-for-approval never`처럼 쓰면 "unexpected argument" 에러가 난다. exec에는 그 플래그를 아예 쓰지 않는다.
- **이 위험한 플래그는 Claude Code 세션 자체의 자동 모드 안전 분류기가 Bash 도구 호출을 차단할 수 있다.** 차단되면 억지로 우회하려 하지 말고, 사용자에게 상황을 설명하고 "사용자 자신의(또는 다른) 터미널에서 직접 실행해달라"고 요청한다 — 그 세션의 분류기는 다르게 판단할 수 있다.

### 3. 결과 검증 (Codex를 맹신하지 않는다)

Codex가 쓴 리뷰 파일을 읽고, **지적 하나하나를 실제 파일을 열어서 확인**한다:
- 실제로 그 줄에 그 코드가 있는지, 지적한 실패 시나리오가 진짜 재현되는지 확인.
- 타당한 지적만 고친다. 이미 처리된 것과 겹치거나, 실제로는 버그가 아닌 지적(예: 일관되게 UTC를 쓰는 코드에 "타임존 버그"라고 잘못 지적하는 경우)은 왜 반영하지 않는지 이유를 남긴다.
- 고친 뒤에는 로컬 정적 서버로 실제 브라우저에서 재현/재검증한다(콘솔 에러, 회귀 여부 등).
- 리뷰 파일 하단에 "처리 결과" 절을 덧붙여 무엇을 확인했고, 무엇을 고쳤고, 무엇을 왜 보류했는지 기록한다 — `apps/2048/review.md`, `apps/pixel-editor/review.md`, `gemini-review.md`가 이 형식의 실제 예시다.
- 수정 완료 후 `git fetch`로 충돌 확인 → 커밋 → push.

## 권한/퍼미션 설정 메모

- **codex exec 유효 플래그**: `-C <dir>`(작업 디렉터리), `--sandbox <read-only|workspace-write|danger-full-access>`(이 환경에선 workspace-write가 사실상 read-only처럼 모든 걸 막으니 신뢰하지 말 것), `--dangerously-bypass-approvals-and-sandbox`(실제로 동작하는 유일한 방법), `-m/--model`, `--json`, `-o/--output-last-message <file>` 등. `--ask-for-approval`은 exec에는 없다(top-level 전용).
- **codex 계정/로그인 상태**: `~/.codex/config.toml`에 모델 오버라이드가 없으면 계정 기본 모델을 쓴다. 로그인 여부는 `codex login status`(다른 세션에서 이미 OAuth 로그인 완료됨)로 확인 가능.
- **git 권한**: 이 저장소는 매일 자동 커밋되는 클라우드 루틴이 붙어 있다. 항상 `git fetch origin && git status`를 커밋 직전에 실행해 원격이 앞서 있지 않은지 확인하고, 앞서 있으면 `git pull --ff-only`(로컬에 손댄 게 있으면 `git stash`로 감쌌다가 pull 후 `git stash pop`) 먼저 실행한다.
- **Claude Code 자체 분류기**: Bash 도구로 위험한 플래그(`--dangerously-bypass-approvals-and-sandbox` 등)를 직접 실행하면 이 세션의 안전 분류기가 막을 수 있다. 이건 우회 대상이 아니라 존중해야 할 안전장치다 — 막히면 사용자에게 그대로 알리고 다른 경로(사용자의 터미널)를 제안한다.

## 막히면

Codex 실행이 계속 막히거나(샌드박스, 분류기, 로그인 만료 등) 어떤 지적을 반영해야 할지 애매하면, 짐작으로 진행하지 말고 사용자에게 상황과 선택지를 설명하고 물어본다.
