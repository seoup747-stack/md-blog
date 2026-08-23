/*
 * 최소 기능 마크다운 → HTML 파서 (외부 라이브러리 없음).
 * 지원: 제목(#~######), 굵게/기울임, 인라인 코드, 코드블록(```), 링크, 이미지,
 *       순서/비순서 목록, 인용문(>), 수평선(---), 문단.
 * 항상 HTML 특수문자를 이스케이프한 뒤 마크다운 문법을 적용하므로,
 * 글 본문에 우연히 <script> 같은 텍스트가 있어도 그대로 렌더링되지 않는다.
 */
(function () {
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // 입력은 이미 escapeHtml을 거친 텍스트라고 가정한다.
  function parseInline(text) {
    // 이미지: ![alt](url "title")
    text = text.replace(
      /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
      function (_, alt, url, title) {
        return (
          '<img src="' +
          url +
          '" alt="' +
          alt +
          '"' +
          (title ? ' title="' + title + '"' : "") +
          ' loading="lazy">'
        );
      }
    );
    // 링크: [text](url "title")
    text = text.replace(
      /\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
      function (_, label, url, title) {
        return (
          '<a href="' +
          url +
          '"' +
          (title ? ' title="' + title + '"' : "") +
          ' target="_blank" rel="noopener noreferrer">' +
          label +
          "</a>"
        );
      }
    );
    // 굵게+기울임: ***text***
    text = text.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
    // 굵게: **text** / __text__
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    // 기울임: *text* / _text_
    text = text.replace(/\*([^*\s][^*]*)\*/g, "<em>$1</em>");
    text = text.replace(/(^|\s)_([^_\s][^_]*)_(?=\s|$)/g, "$1<em>$2</em>");
    // 인라인 코드: `code`
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
    return text;
  }

  function isBlankLine(line) {
    return line.trim() === "";
  }
  function isFence(line) {
    return /^```/.test(line.trim());
  }
  function isHeading(line) {
    return /^#{1,6}\s+/.test(line);
  }
  function isQuote(line) {
    return /^>\s?/.test(line);
  }
  function isUl(line) {
    return /^\s*[-*+]\s+/.test(line);
  }
  function isOl(line) {
    return /^\s*\d+\.\s+/.test(line);
  }
  function isHr(line) {
    return /^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim());
  }

  function parseMarkdown(raw) {
    var lines = String(raw).replace(/\r\n/g, "\n").split("\n");
    var out = [];
    var i = 0;
    var listType = null; // 'ul' | 'ol' | null

    function closeList() {
      if (listType) {
        out.push("</" + listType + ">");
        listType = null;
      }
    }

    while (i < lines.length) {
      var line = lines[i];

      // 코드 블록
      var fenceMatch = line.trim().match(/^```(\S*)\s*$/);
      if (fenceMatch) {
        closeList();
        var lang = fenceMatch[1];
        var buffer = [];
        i++;
        while (i < lines.length && !isFence(lines[i])) {
          buffer.push(lines[i]);
          i++;
        }
        i++; // 닫는 ``` 건너뛰기
        var rawCode = buffer.join("\n");
        var supported = window.highlightSupports && window.highlightSupports(lang);
        var codeHtml = supported ? window.highlightCode(rawCode, lang) : escapeHtml(rawCode);
        var langClass = lang ? ' class="language-' + lang + '"' : "";
        out.push("<pre><code" + langClass + ">" + codeHtml + "</code></pre>");
        continue;
      }

      // 빈 줄
      if (isBlankLine(line)) {
        closeList();
        i++;
        continue;
      }

      // 제목
      var headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        closeList();
        var level = headingMatch[1].length;
        var content = parseInline(escapeHtml(headingMatch[2].trim()));
        out.push("<h" + level + ">" + content + "</h" + level + ">");
        i++;
        continue;
      }

      // 수평선
      if (isHr(line)) {
        closeList();
        out.push("<hr>");
        i++;
        continue;
      }

      // 인용문 (연속 줄 병합)
      if (isQuote(line)) {
        closeList();
        var quoteLines = [];
        while (i < lines.length && isQuote(lines[i])) {
          quoteLines.push(lines[i].replace(/^>\s?/, ""));
          i++;
        }
        out.push(
          "<blockquote><p>" +
            parseInline(escapeHtml(quoteLines.join(" "))) +
            "</p></blockquote>"
        );
        continue;
      }

      // 비순서 목록
      if (isUl(line)) {
        if (listType !== "ul") {
          closeList();
          out.push("<ul>");
          listType = "ul";
        }
        var ulText = line.replace(/^\s*[-*+]\s+/, "");
        out.push("<li>" + parseInline(escapeHtml(ulText)) + "</li>");
        i++;
        continue;
      }

      // 순서 목록
      if (isOl(line)) {
        if (listType !== "ol") {
          closeList();
          out.push("<ol>");
          listType = "ol";
        }
        var olText = line.replace(/^\s*\d+\.\s+/, "");
        out.push("<li>" + parseInline(escapeHtml(olText)) + "</li>");
        i++;
        continue;
      }

      // 문단 (다음 블록 시작 전까지 줄바꿈을 공백으로 병합)
      closeList();
      var paraLines = [line];
      i++;
      while (
        i < lines.length &&
        !isBlankLine(lines[i]) &&
        !isFence(lines[i]) &&
        !isHeading(lines[i]) &&
        !isQuote(lines[i]) &&
        !isUl(lines[i]) &&
        !isOl(lines[i]) &&
        !isHr(lines[i])
      ) {
        paraLines.push(lines[i]);
        i++;
      }
      out.push("<p>" + parseInline(escapeHtml(paraLines.join(" "))) + "</p>");
    }

    closeList();
    return out.join("\n");
  }

  window.parseMarkdown = parseMarkdown;
})();
