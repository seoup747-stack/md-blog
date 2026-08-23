/* 글 상세 페이지(post.html) 로직 */
(function () {
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(dateStr) {
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function renderTagBadges(post) {
    if (!post.tags || !post.tags.length) return "";
    return (
      '<div class="post-tags">' +
      post.tags
        .map(function (t) {
          return (
            '<a class="tag-badge" href="index.html?tag=' +
            encodeURIComponent(t) +
            '">' +
            escapeHtml(t) +
            "</a>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function getSlug() {
    return new URLSearchParams(window.location.search).get("slug");
  }

  async function loadPosts() {
    var res = await fetch("posts/manifest.json");
    if (!res.ok) throw new Error("manifest.json을 불러오지 못했습니다.");
    var data = await res.json();
    return Array.isArray(data) ? data : data.posts || [];
  }

  function renderMessage(html) {
    document.getElementById("post-article").innerHTML =
      '<p class="error-state">' + html + "</p>";
  }

  async function init() {
    var slug = getSlug();
    if (!slug) {
      renderMessage("잘못된 주소입니다. 목록에서 글을 선택해 주세요.");
      return;
    }

    var posts;
    try {
      posts = await loadPosts();
    } catch (err) {
      renderMessage(
        "글 목록을 불러오지 못했습니다.<br>로컬 서버로 실행 중인지 확인해 주세요."
      );
      console.error(err);
      return;
    }

    var post = posts.find(function (p) {
      return p.slug === slug;
    });
    if (!post) {
      renderMessage("해당 글을 찾을 수 없습니다.");
      return;
    }

    try {
      var res = await fetch("posts/" + post.file);
      if (!res.ok) throw new Error("마크다운 파일을 불러오지 못했습니다.");
      var raw = await res.text();
      var bodyHtml = window.parseMarkdown(raw);

      document.title = post.title + " · md-blog";
      document.getElementById("post-article").innerHTML =
        '<header class="post-header">' +
        '<div class="post-meta">' +
        formatDate(post.date) +
        "</div>" +
        "<h1>" +
        escapeHtml(post.title) +
        "</h1>" +
        renderTagBadges(post) +
        "</header>" +
        '<div class="post-content">' +
        bodyHtml +
        "</div>";
    } catch (err) {
      renderMessage("글을 불러오는 중 문제가 발생했습니다.");
      console.error(err);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var toggle = document.getElementById("theme-toggle");
    if (toggle && window.MdBlogTheme) window.MdBlogTheme.initThemeToggle(toggle);
    init();
  });
})();
