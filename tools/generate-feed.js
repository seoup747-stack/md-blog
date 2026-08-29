#!/usr/bin/env node
/*
 * posts/manifest.json을 읽어 RSS 2.0 feed.xml을 생성하는 저작 도구.
 *
 * 이 스크립트는 사이트 런타임(브라우저에서 실행되는 코드)의 일부가 아니라,
 * 글을 추가/수정한 뒤 로컬에서 수동으로 한 번 실행하는 개발 보조 도구다.
 * (md-blog/CLAUDE.md의 "빌드 도구 금지"는 사이트 자체의 배포/구동 방식에
 *  대한 제약이며, 이런 선택적 저작 도구까지 금지하지는 않는다.)
 *
 * 실행:
 *   node tools/generate-feed.js
 *
 * 의존성 없이 Node.js 내장 모듈만 사용한다.
 */
const fs = require("fs");
const path = require("path");

// 배포할 실제 주소로 바꿔서 사용하세요. 소스를 고치지 않고도 실행 시점에
// MD_BLOG_SITE_URL 환경변수로 덮어쓸 수 있다 (예: 배포 파이프라인에서).
const SITE_URL = process.env.MD_BLOG_SITE_URL || "https://example.com/md-blog";
const SITE_TITLE = "md-blog";
const SITE_DESCRIPTION = "마크다운으로 쓰고 정적으로 배포하는 블로그";

const ROOT_DIR = path.join(__dirname, "..");
const MANIFEST_PATH = path.join(ROOT_DIR, "posts", "manifest.json");
const OUTPUT_PATH = path.join(ROOT_DIR, "feed.xml");

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// manifest.json의 date는 "YYYY-MM-DD"만 있는 날짜라 UTC 자정으로 해석된다.
// 여기서는 그대로 UTC로 다시 출력하므로(입력도 UTC 자정, 출력도 UTC) 서로
// 어긋나지 않는다 — 화면 표시용 formatDate()처럼 로컬 타임존으로 바꾸는
// 코드가 있었다면 그쪽만 하루씩 밀렸을 것이다.
function toRfc822(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

function main() {
  const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
  const data = JSON.parse(raw);
  const posts = Array.isArray(data) ? data : data.posts || [];

  const sorted = posts
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const items = sorted
    .map((post) => {
      const link = `${SITE_URL}/post.html?slug=${encodeURIComponent(post.slug)}`;
      const categories = (post.tags || [])
        .map((t) => `      <category>${escapeXml(t)}</category>`)
        .join("\n");
      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="false">${escapeXml(post.slug)}</guid>`,
        `      <pubDate>${toRfc822(post.date)}</pubDate>`,
        post.summary ? `      <description>${escapeXml(post.summary)}</description>` : "",
        categories,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  const lastBuildDate = new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>ko</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  fs.writeFileSync(OUTPUT_PATH, xml, "utf8");
  console.log(`feed.xml 생성 완료 (${sorted.length}개 글): ${OUTPUT_PATH}`);
  if (SITE_URL.includes("example.com")) {
    console.warn(
      "경고: SITE_URL이 아직 예시 도메인(example.com)입니다. " +
        "실제 배포 주소가 정해지면 이 파일 상단의 SITE_URL을 바꾸거나 " +
        "MD_BLOG_SITE_URL 환경변수로 지정하세요 — 지금 상태로는 RSS 구독자가 " +
        "글을 클릭해도 실제 블로그로 연결되지 않습니다."
    );
  }
}

main();
