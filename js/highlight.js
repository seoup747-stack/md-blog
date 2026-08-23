/*
 * 아주 단순한 자체 구현 코드 문법 강조기 (외부 라이브러리 없음).
 * 완전한 렉서가 아니라, 언어별로 "주석/문자열/숫자/키워드" 등을 하나의
 * 결합 정규식(named capture group)으로 스캔해 <span class="tok-*">로 감싼다.
 * 지원하지 않는 언어는 markdown.js 쪽에서 이 파일을 아예 거치지 않고
 * 이스케이프만 하도록 폴백한다 (safeHighlight 참고).
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

  function kw(words) {
    return "\\b(?:" + words.join("|") + ")\\b";
  }

  var LANGUAGES = {};
  function define(names, source) {
    var re = new RegExp(source, "g");
    names.forEach(function (name) {
      LANGUAGES[name] = re;
    });
  }

  // JavaScript / TypeScript
  define(
    ["js", "javascript", "ts", "typescript", "jsx", "tsx"],
    [
      "(?<comment>//[^\\n]*|/\\*[\\s\\S]*?\\*/)",
      "(?<string>`(?:\\\\.|[^`\\\\])*`|\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*')",
      "(?<number>\\b\\d+(?:\\.\\d+)?\\b)",
      "(?<keyword>" +
        kw([
          "const","let","var","function","return","if","else","for","while","do",
          "class","extends","new","typeof","instanceof","import","from","export",
          "default","async","await","try","catch","finally","throw","switch","case",
          "break","continue","this","super","null","undefined","true","false","in","of",
          "interface","type","implements","enum"
        ]) +
        ")"
    ].join("|")
  );

  // Python
  define(
    ["python", "py"],
    [
      "(?<comment>#[^\\n]*)",
      "(?<string>[fFrRbB]{0,2}(?:'''[\\s\\S]*?'''|\"\"\"[\\s\\S]*?\"\"\"|'(?:\\\\.|[^'\\\\])*'|\"(?:\\\\.|[^\"\\\\])*\"))",
      "(?<number>\\b\\d+(?:\\.\\d+)?\\b)",
      "(?<keyword>" +
        kw([
          "def","class","return","if","elif","else","for","while","import","from","as",
          "with","try","except","finally","raise","pass","break","continue","lambda",
          "None","True","False","and","or","not","in","is","yield","global","nonlocal",
          "async","await","self"
        ]) +
        ")"
    ].join("|")
  );

  // Bash / Shell
  define(
    ["bash", "sh", "shell", "zsh"],
    [
      "(?<comment>#[^\\n]*)",
      "(?<string>\"(?:\\\\.|[^\"\\\\])*\"|'[^']*')",
      "(?<variable>\\$\\{[^}]+\\}|\\$[A-Za-z_][A-Za-z0-9_]*)",
      "(?<keyword>" +
        kw([
          "if","then","else","elif","fi","for","do","done","while","case","esac",
          "function","echo","export","return","local","in","exit"
        ]) +
        ")"
    ].join("|")
  );

  // JSON
  define(
    ["json"],
    [
      '(?<key>"(?:\\\\.|[^"\\\\])*"(?=\\s*:))',
      '(?<string>"(?:\\\\.|[^"\\\\])*")',
      "(?<number>-?\\b\\d+(?:\\.\\d+)?\\b)",
      "(?<keyword>\\btrue\\b|\\bfalse\\b|\\bnull\\b)"
    ].join("|")
  );

  // CSS
  define(
    ["css"],
    [
      "(?<comment>/\\*[\\s\\S]*?\\*/)",
      "(?<string>\"[^\"]*\"|'[^']*')",
      "(?<keyword>@[a-zA-Z-]+)",
      "(?<attr>[a-zA-Z-]+(?=\\s*:))",
      "(?<number>#[0-9a-fA-F]{3,8}\\b|\\b\\d+(?:\\.\\d+)?(?:px|em|rem|%|vh|vw|s|ms)?\\b)"
    ].join("|")
  );

  // HTML / XML
  define(
    ["html", "xml"],
    [
      "(?<comment><!--[\\s\\S]*?-->)",
      "(?<tag></?[a-zA-Z][a-zA-Z0-9-]*)",
      "(?<string>\"[^\"]*\"|'[^']*')",
      "(?<attr>[a-zA-Z-]+(?=\\s*=))"
    ].join("|")
  );

  function highlightCode(code, lang) {
    var re = LANGUAGES[(lang || "").toLowerCase()];
    if (!re) return escapeHtml(code);

    re.lastIndex = 0;
    var out = "";
    var lastIndex = 0;
    var match;
    while ((match = re.exec(code))) {
      if (match.index > lastIndex) {
        out += escapeHtml(code.slice(lastIndex, match.index));
      }
      var groups = match.groups || {};
      var type = Object.keys(groups).filter(function (k) {
        return groups[k] !== undefined;
      })[0];
      out += type
        ? '<span class="tok-' + type + '">' + escapeHtml(match[0]) + "</span>"
        : escapeHtml(match[0]);
      lastIndex = re.lastIndex;
      if (match.index === re.lastIndex) re.lastIndex++; // 무한루프 방지
    }
    if (lastIndex < code.length) {
      out += escapeHtml(code.slice(lastIndex));
    }
    return out;
  }

  function supportsLanguage(lang) {
    return !!LANGUAGES[(lang || "").toLowerCase()];
  }

  window.highlightCode = highlightCode;
  window.highlightSupports = supportsLanguage;
})();
