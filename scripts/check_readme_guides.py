"""Check the operating README and both referenced training/evaluation READMEs.

Run from the site root: python scripts/check_readme_guides.py
The ignored BREE-v1 checkout must contain the user's source BREE/README.md.
Only CRLF/LF line-ending differences are normalized; command whitespace is preserved.
"""

from collections import Counter
from html import escape, unescape
from html.parser import HTMLParser
from pathlib import Path
from difflib import unified_diff
from functools import lru_cache
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "BREE-v1/BREE/README.md"
PAGES = {
    0: "index", 1: "index", 2: "index", 3: "software", 4: "software",
    5: "calibration", 6: "calibration", 7: "collection", 8: "collection",
    9: "collection", 10: "training", 11: "evaluation", 12: "index",
    13: "troubleshooting",
}
REFERENCES = {
    "model-training": (ROOT / "BREE-v1/BREE/model_training/README.md", "training"),
    "openpi-evaluation": (ROOT / "BREE-v1/BREE/openpi_eval/README.md", "evaluation"),
}
DISPLAY_LEVELS = {61: 2, 68: 2}  # Separate H-pose and global-camera steps visually.


def blocks(source, *, page=None, reference=None):
    """Parse this README's headings, paragraphs, lists, tables and fenced code."""
    lines = source.splitlines(keepends=True)
    result = []
    section = 0
    i = 0
    code_id = 0
    while i < len(lines):
        if not lines[i].strip():
            i += 1
            continue
        start = i
        if lines[i].startswith("```"):
            language = lines[i].strip()[3:]
            i += 1
            while i < len(lines) and lines[i].strip() != "```":
                i += 1
            if i == len(lines):
                raise ValueError("Unclosed code fence")
            code_id += 1
            block = {"kind": "code", "language": language,
                     "text": "".join(lines[start + 1:i]), "code_id": code_id}
            i += 1
        else:
            while i < len(lines) and lines[i].strip():
                i += 1
            text = "".join(lines[start:i]).rstrip("\n")
            heading = re.fullmatch(r"(#{1,4}) (.+)", text)
            if heading:
                level = len(heading[1])
                if level == 2:
                    number = re.match(r"(\d+)\.", heading[2])
                    if number:
                        section = int(number[1])
                    elif page is None:
                        raise ValueError(f"Unmapped operating-guide section: {heading[2]}")
                block = {"kind": "heading", "level": level, "text": heading[2]}
            elif text.startswith("|"):
                block = {"kind": "table", "text": text}
            elif re.match(r"(?:- |\d+\. )", text):
                block = {"kind": "list", "text": text}
            else:
                block = {"kind": "paragraph", "text": text}
        block.update(id=len(result) + 1, section=section,
                     page=page if page is not None else PAGES[section])
        if reference:
            block["reference"] = reference
        result.append(block)
    return result


def inline(text):
    parts = re.split(r"(`[^`]+`)", text)
    return "".join("<code>" + escape(p[1:-1], quote=False) + "</code>"
                   if p.startswith("`") else escape(p, quote=False) for p in parts)


@lru_cache(maxsize=1)
def translations():
    result = {}
    for path in sorted((ROOT / "assets/i18n").glob("readme-*-en.json")):
        for original, english in json.loads(path.read_text(encoding="utf-8")).items():
            if original in result and result[original] != english:
                raise ValueError(f"Conflicting English translation: {original}")
            result[original] = english
    return result


def bilingual(text):
    if not re.search(r"[\u4e00-\u9fff]", text):
        return inline(text)
    english = translations().get(text)
    if not english:
        raise ValueError(f"Missing English translation: {text}")
    if re.findall(r"`([^`]+)`", text) != re.findall(r"`([^`]+)`", english):
        raise ValueError(f"Translation changes inline code: {text}")
    if re.search(r"[\u4e00-\u9fff]", re.sub(r"`[^`]+`", "", english)):
        raise ValueError(f"Untranslated English prose: {text}")
    return ('<span data-lang="en" lang="en">' + inline(english) + '</span>'
            '<span data-lang="zh" lang="zh-CN">' + inline(text) + '</span>')


def render(block):
    reference = block.get("reference")
    if reference:
        attr = (f' data-reference-source="{reference}" data-reference-block="{block["id"]}"'
                ' data-i18n-ignore lang="zh-CN"')
    else:
        attr = f' data-readme-block="{block["id"]}" data-i18n-ignore lang="zh-CN"'
    text = block["text"]
    kind = block["kind"]
    if kind == "code":
        code_attr = 'data-reference-code' if reference else 'data-readme-code'
        return ('<div class="codeblock"><div class="codeblock-head"><span>'
                + escape(block["language"]) + '</span><button class="copy-btn" type="button">Copy</button></div>'
                + f'<pre><code{attr} {code_attr}="{block["code_id"]}">'
                + escape(text, quote=False) + '</code></pre></div>')
    if kind == "heading":
        level = block["level"] + (1 if reference else 0)
        if not reference:
            level = DISPLAY_LEVELS.get(block["id"], level)
        number = re.match(r"(\d+(?:\.\d+)*)\.? ", text)
        anchor = "readme-" + (number[1].replace(".", "-") if number else f'block-{block["id"]}')
        if reference:
            anchor = reference + "-" + anchor
        return f'<h{level}{attr} id="{anchor}">{bilingual(text)}</h{level}>'
    if kind == "paragraph":
        return f'<p{attr}>{bilingual(text)}</p>'
    if kind == "list":
        ordered = bool(re.match(r"\d+\. ", text))
        tag = "ol" if ordered else "ul"
        items = []
        for line in text.splitlines():
            match = re.fullmatch(r"(?:- |\d+\. )(.+)", line)
            if not match:
                raise ValueError(f"Unsupported list: {line}")
            items.append("<li>" + bilingual(match[1]) + "</li>")
        return f'<{tag}{attr}>' + "".join(items) + f'</{tag}>'
    if kind == "table":
        rows = [[cell.strip() for cell in line.strip().strip("|").split("|")]
                for line in text.splitlines()]
        if not all(re.fullmatch(r":?-+:?", cell) for cell in rows[1]):
            raise ValueError("Unsupported table separator")
        def row(cells, tag):
            return "<tr>" + "".join(f"<{tag}>" + bilingual(cell) + f"</{tag}>" for cell in cells) + "</tr>"
        return (f'<div class="table-wrap"{attr}><table class="table"><thead>'
                + row(rows[0], "th") + '</thead><tbody>'
                + "".join(row(cells, "td") for cells in rows[2:]) + '</tbody></table></div>')
    raise ValueError(kind)


def marked(block):
    key = (f'reference-block:{block["reference"]}' if block.get("reference")
           else 'readme-block')
    return (f'<!-- {key}:{block["id"]}:start -->\n' + render(block)
            + f'\n<!-- {key}:{block["id"]}:end -->')


def require(condition, message):
    if not condition:
        raise AssertionError(message)


class CodeText(HTMLParser):
    """Decode actual HTML code text independently of the Markdown renderer."""

    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.codes = []
        self.current = None
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "code" and ("data-readme-code" in attrs or "data-reference-code" in attrs):
            source = attrs.get("data-reference-source", "operation")
            number = attrs.get("data-reference-code", attrs.get("data-readme-code"))
            self.current = [source, int(number), ""]

    def handle_data(self, text):
        if self.current is not None:
            self.current[2] += text

    def handle_endtag(self, tag):
        if tag == "code" and self.current is not None:
            self.codes.append(tuple(self.current))
            self.current = None


def check():
    expected = blocks(SOURCE.read_text(encoding="utf-8"))
    pages = {name: (ROOT / f"setup/{name}.html").read_text(encoding="utf-8")
             for name in set(PAGES.values())}
    for block in expected:
        require(marked(block) in pages[block["page"]],
            f'README block {block["id"]} differs or is missing: '
            f'{block["page"]}.html / {block["text"][:70]!r}')
    # The installation page also repeats the source's exact runtime preamble.
    for block in expected[1:4]:
        duplicate = render(block).replace('data-readme-block=', 'data-readme-copy=')
        duplicate = re.sub(r' data-readme-code="\d+"', '', duplicate)
        require(duplicate in pages["software"], "Installation runtime preamble differs")
    ids = [int(n) for page in pages.values() for n in re.findall(r'data-readme-block="(\d+)"', page)]
    require(Counter(ids) == Counter(b["id"] for b in expected), "Missing or duplicated prose blocks")
    actual_codes = [(int(n), unescape(code)) for page in pages.values()
                    for n, code in re.findall(r'<code[^>]*data-readme-code="(\d+)">(.*?)</code>', page, re.S)]
    codes = [b for b in expected if b["kind"] == "code"]
    require(sorted(actual_codes) == [(b["code_id"], b["text"]) for b in codes], "Code text mismatch")
    bash = sum(b["language"] == "bash" for b in codes)
    print(f'PASS: all {len(expected)} README blocks across {len(pages)} pages; '
          f'{len(codes)} fenced blocks ({bash} bash) match exactly after CRLF/LF normalization.')
    documents = {"operation": expected}
    for reference, (path, page) in REFERENCES.items():
        document = blocks(path.read_text(encoding="utf-8"), page=page, reference=reference)
        documents[reference] = document
        for block in document:
            require(marked(block) in pages[page],
                    f'{reference} block {block["id"]} differs or is missing in {page}.html')
        actual_ids = [int(n) for n in re.findall(
            rf'data-reference-source="{reference}" data-reference-block="(\d+)"', pages[page])]
        require(Counter(actual_ids) == Counter(b["id"] for b in document),
                f"Missing or duplicated blocks in {reference}")
        count = sum(b["kind"] == "code" for b in document)
        print(f'PASS: {path.relative_to(ROOT).as_posix()}: {len(document)} blocks, '
              f'{count} fenced blocks, fully included in setup/{page}.html.')
    decoded = [code for page in pages.values() for code in CodeText(page).codes]
    expected_codes = [(reference, block["code_id"], block["text"])
                      for reference, document in documents.items()
                      for block in document if block["kind"] == "code"]
    actual_map = {(reference, number): text for reference, number, text in decoded}
    require(len(actual_map) == len(decoded), "Duplicated decoded code IDs")
    for reference, number, text in expected_codes:
        actual = actual_map.get((reference, number))
        difference = "".join(unified_diff(text.splitlines(keepends=True),
                                         (actual or "").splitlines(keepends=True),
                                         fromfile="README", tofile="HTML"))
        require(actual == text, f'{reference} code {number} differs:\n{difference}')
    require(len(decoded) == len(expected_codes), "Unexpected source-tagged code blocks")
    total = sum(len(document) for document in documents.values())
    print(f'PASS: {len(documents)} complete READMEs, {total} content blocks, '
          f'{len(decoded)} decoded code blocks; no command executed or rewritten.')
    print('PASS: source prose has paired English/Chinese text; '
          'translations preserve all inline code and leave fenced commands unchanged.')


if __name__ == "__main__":
    check()
