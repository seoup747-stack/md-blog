/*
 * main.js와 post.js가 함께 쓰는 유틸리티.
 * (예전엔 두 파일에 각자 복사돼 있어서, 버그를 고칠 때 한쪽만 고치고
 *  다른 쪽을 빠뜨리기 쉬웠다 — 이제 여기 한 곳만 고치면 둘 다 반영된다.)
 */
(function () {
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // manifest.json의 날짜는 "YYYY-MM-DD" 형식이다. 이 문자열을 그냥 new Date()에
  // 넘기면 UTC 자정으로 해석되는데, 음의 UTC 오프셋 지역(미주 등)에서는 로컬
  // 시간으로 변환하는 과정에서 하루 전날로 표시되는 문제가 있다. 연/월/일을
  // 직접 분해해서 로컬 타임존 기준으로 날짜를 만들면 이 문제가 없다.
  function formatDate(dateStr) {
    var match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr));
    var d = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  window.MdBlogUtils = { escapeHtml: escapeHtml, formatDate: formatDate };
})();
