/* 글 목록 페이지(index.html) 로직: 목록 렌더링, 태그 필터, 검색 */
(function () {
  var allPosts = [];
  var bodyCache = {}; // slug -> 소문자 원문 (검색용, 백그라운드로 채워짐)
  var state = { tag: "", query: "" };

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

  async function loadPosts() {
    var res = await fetch("posts/manifest.json");
    if (!res.ok) throw new Error("manifest.json을 불러오지 못했습니다.");
    var data = await res.json();
    return Array.isArray(data) ? data : data.posts || [];
  }

  // --- URL 상태 동기화 (?tag=, ?q=) ---
  function readStateFromUrl() {
    var params = new URLSearchParams(window.location.search);
    state.tag = params.get("tag") || "";
    state.query = params.get("q") || "";
  }

  function writeStateToUrl() {
    var params = new URLSearchParams();
    if (state.tag) params.set("tag", state.tag);
    if (state.query) params.set("q", state.query);
    var qs = params.toString();
    var newUrl =
      window.location.pathname + (qs ? "?" + qs : "");
    window.history.replaceState(null, "", newUrl);
  }

  // --- 태그 칩 ---
  function renderTagChips() {
    var container = document.getElementById("tag-filter");
    var allTags = new Set();
    allPosts.forEach(function (post) {
      (post.tags || []).forEach(function (t) {
        allTags.add(t);
      });
    });

    var chips = ['<button type="button" class="tag-chip' +
      (state.tag === "" ? " active" : "") +
      '" data-tag="">전체</button>'];
    Array.from(allTags)
      .sort()
      .forEach(function (tag) {
        chips.push(
          '<button type="button" class="tag-chip' +
            (state.tag === tag ? " active" : "") +
            '" data-tag="' +
            escapeHtml(tag) +
            '">' +
            escapeHtml(tag) +
            "</button>"
        );
      });
    container.innerHTML = chips.join("");

    container.querySelectorAll(".tag-chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.tag = btn.getAttribute("data-tag") || "";
        writeStateToUrl();
        renderTagChips();
        renderList();
      });
    });
  }

  // --- 검색/필터 매칭 ---
  function matchesQuery(post, query) {
    if (!query) return true;
    var q = query.toLowerCase();
    var haystack =
      post.title + " " + (post.summary || "") + " " + (post.tags || []).join(" ");
    if (haystack.toLowerCase().indexOf(q) !== -1) return true;
    var body = bodyCache[post.slug];
    return !!body && body.indexOf(q) !== -1;
  }

  function matchesTag(post, tag) {
    if (!tag) return true;
    return (post.tags || []).indexOf(tag) !== -1;
  }

  function getFilteredPosts() {
    return allPosts
      .filter(function (post) {
        return matchesTag(post, state.tag) && matchesQuery(post, state.query);
      })
      .sort(function (a, b) {
        return new Date(b.date) - new Date(a.date);
      });
  }

  function renderTagBadges(post) {
    if (!post.tags || !post.tags.length) return "";
    return (
      '<div class="post-tags">' +
      post.tags
        .map(function (t) {
          return '<span class="tag-badge">' + escapeHtml(t) + "</span>";
        })
        .join("") +
      "</div>"
    );
  }

  function renderList() {
    var container = document.getElementById("post-list");
    var posts = getFilteredPosts();
    if (!posts.length) {
      container.innerHTML =
        '<p class="empty-state">조건에 맞는 글이 없습니다.</p>';
      return;
    }
    container.innerHTML = posts
      .map(function (post) {
        return (
          '<a class="post-card" href="post.html?slug=' +
          encodeURIComponent(post.slug) +
          '">' +
          '<div class="post-meta">' +
          formatDate(post.date) +
          "</div>" +
          "<h2>" +
          escapeHtml(post.title) +
          "</h2>" +
          (post.summary
            ? '<p class="post-summary">' + escapeHtml(post.summary) + "</p>"
            : "") +
          renderTagBadges(post) +
          "</a>"
        );
      })
      .join("");
  }

  // --- 검색용 본문 백그라운드 프리페치 ---
  function prefetchBodies() {
    allPosts.forEach(function (post) {
      fetch("posts/" + post.file)
        .then(function (res) {
          return res.ok ? res.text() : "";
        })
        .then(function (text) {
          bodyCache[post.slug] = text.toLowerCase();
          // 이미 입력된 검색어가 있으면, 캐시가 채워진 뒤 결과가 바뀔 수 있으니 다시 그린다.
          if (state.query) renderList();
        })
        .catch(function () {
          /* 본문 검색은 부가 기능이므로 실패해도 무시 */
        });
    });
  }

  var searchDebounceTimer = null;
  function onSearchInput(value) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(function () {
      state.query = value.trim();
      writeStateToUrl();
      renderList();
    }, 150);
  }

  async function init() {
    var container = document.getElementById("post-list");
    readStateFromUrl();

    var searchInput = document.getElementById("search-input");
    searchInput.value = state.query;
    searchInput.addEventListener("input", function (e) {
      onSearchInput(e.target.value);
    });

    try {
      allPosts = await loadPosts();
      renderTagChips();
      renderList();
      prefetchBodies();
    } catch (err) {
      container.innerHTML =
        '<p class="error-state">글 목록을 불러오지 못했습니다.<br>' +
        "브라우저에서 파일을 직접 여는 대신, 로컬 서버로 실행 중인지 확인해 주세요.</p>";
      console.error(err);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var toggle = document.getElementById("theme-toggle");
    if (toggle && window.MdBlogTheme) window.MdBlogTheme.initThemeToggle(toggle);
    init();
  });
})();
