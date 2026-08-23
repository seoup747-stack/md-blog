/*
 * 다크모드 토글 공용 로직.
 * 실제 "깜빡임 없는 초기 테마 적용"은 각 HTML <head>의 인라인 스크립트가
 * 페인트 이전에 처리한다. 이 파일은 토글 버튼 동작만 담당한다.
 */
(function () {
  var STORAGE_KEY = "md-blog-theme";

  function isCurrentlyDark() {
    var attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark") return true;
    if (attr === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function applyTheme(theme) {
    if (theme === "dark" || theme === "light") {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  function updateButton(buttonEl) {
    var dark = isCurrentlyDark();
    buttonEl.textContent = dark ? "☀️" : "🌙";
    buttonEl.setAttribute(
      "aria-label",
      dark ? "라이트 모드로 전환" : "다크 모드로 전환"
    );
  }

  function initThemeToggle(buttonEl) {
    if (!buttonEl) return;
    updateButton(buttonEl);
    buttonEl.addEventListener("click", function () {
      var next = isCurrentlyDark() ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      updateButton(buttonEl);
    });
  }

  window.MdBlogTheme = { initThemeToggle: initThemeToggle };
})();
