# md-blog

마크다운 파일을 읽어서 정적 블로그로 보여주는, 프레임워크 없는 순수 HTML/CSS/JS 프로젝트입니다.
설계 원칙과 아키텍처는 [CLAUDE.md](CLAUDE.md)를 참고하세요.

## 실행 방법

`fetch()`로 `posts/manifest.json`과 `.md` 파일을 읽어오기 때문에, `index.html`을 더블클릭해서
`file://`로 여는 방식은 브라우저 보안 정책(CORS)에 막혀 동작하지 않습니다. 반드시 로컬 웹 서버로
실행하세요.

**Python이 설치되어 있다면:**

```bash
cd md-blog
python -m http.server 8000
```

이후 브라우저에서 `http://localhost:8000` 접속.

**Node.js가 설치되어 있다면:**

```bash
cd md-blog
npx serve
```

VS Code를 쓴다면 "Live Server" 확장으로 `index.html`을 열어도 됩니다.

## 새 글 추가하기

1. `posts/` 폴더에 `.md` 파일을 작성합니다.
2. `posts/manifest.json`의 `posts` 배열에 항목을 추가합니다.

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

3. 저장 후 새로고침하면 목록 페이지에 최신순으로 나타나고, 태그 필터/검색 대상에도 자동으로 포함됩니다.

## RSS 피드 갱신

`feed.xml`은 자동으로 갱신되지 않는 정적 파일입니다. 글을 추가/수정한 뒤 아래 명령으로 다시 생성하세요 (Node.js 필요, 별도 의존성 없음):

```bash
cd md-blog
node tools/generate-feed.js
```

배포 전에는 `tools/generate-feed.js` 상단의 `SITE_URL`을 실제 도메인으로 바꿔주세요.

## 코드 문법 강조

코드블록에 언어를 지정하면(예: ` ```js `) `js/highlight.js`가 자체 구현한 강조를 적용합니다. 현재 지원 언어는 `js`/`ts`, `python`, `bash`/`sh`, `json`, `css`, `html`이며, 그 외 언어는 강조 없이 그대로 표시됩니다.
