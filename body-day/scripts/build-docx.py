#!/usr/bin/env python3
"""把《作品开发文档》Markdown 转成赛事要求的 .docx（python-docx）。

为什么放在仓库里：这个脚本是可复现的交付工具——只要 `delivery/docs/作品开发文档.md`
还在，就能重新生成与它一致的 .docx（含 14 张真实运行截图）。
（此前它只在临时目录里，临时目录被系统清理后就丢了，所以正式收进仓库。）

- 标题 / 段落 / 无序列表 / 引用 / 表格 / 图片 全部映射到 Word 原生结构
- 中文正文设为「等线」，代码用等宽字体，表格用 Table Grid
- 正文之后追加「附录 · 页面截图」，逐张嵌入 delivery/test-evidence/screenshots/*.png

用法：python3 body-day/scripts/build-docx.py [输入.md] [输出.docx]
默认输入 delivery/docs/作品开发文档.md，默认输出 delivery/docs/作品开发文档.docx
需要：pip install python-docx
"""
import os
import re
import sys
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

REPO_ROOT = Path(__file__).resolve().parents[2]
BODY_FONT = "等线"
MONO_FONT = "Consolas"

CAPTIONS = {
    "01-cover": "启动封面（真实加载进度；就绪后才出现「进入探索」）",
    "02-body": "完整人体（人体总览，装配态；默认中性化展示）",
    "03-explode-25": "部分拆解（25%：体表外壳渐进半透明，内部开始显现）",
    "04-explode-100": "完全拆解（100%：按解剖系统分层分离）",
    "05-system-nervous": "神经系统（人体中只显示该系统）",
    "06-system-cardiovascular": "循环系统",
    "07-system-lymphatic": "淋巴系统",
    "08-organ-brain": "大脑（镜头聚焦 + 其余结构淡化）",
    "09-organ-heart": "心脏（镜头聚焦 + 其余结构淡化）",
    "10-organ-spleen": "脾脏（镜头聚焦 + 其余结构淡化）",
    "11-cell-neuron": "神经元（程序化原创几何，部件可点选）",
    "12-cell-leukocyte": "白细胞",
    "13-about": "关于 · 数据与方法（来源、许可、科学边界与页面索引）",
    "14-mobile-390x844": "移动端 390×844（知识面板可收起）",
}

INLINE = re.compile(r"(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)")


def set_run_font(run, name=BODY_FONT):
    run.font.name = name
    for tag in ("w:eastAsia", "w:ascii", "w:hAnsi"):
        run._element.rPr.rFonts.set(qn(tag), name)


def set_style_font(style, name, size=None, bold=None, color=None):
    style.font.name = name
    if size is not None:
        style.font.size = size
    if bold is not None:
        style.font.bold = bold
    if color is not None:
        style.font.color.rgb = color
    rpr = style.element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = rpr.makeelement(qn("w:rFonts"), {})
        rpr.append(rfonts)
    for tag in ("w:eastAsia", "w:ascii", "w:hAnsi"):
        rfonts.set(qn(tag), name)


def add_inline(paragraph, text):
    for chunk in INLINE.split(text):
        if not chunk:
            continue
        if chunk.startswith("**") and chunk.endswith("**") and len(chunk) > 4:
            run = paragraph.add_run(chunk[2:-2])
            run.bold = True
            set_run_font(run)
        elif chunk.startswith("`") and chunk.endswith("`") and len(chunk) > 2:
            run = paragraph.add_run(chunk[1:-1])
            set_run_font(run, MONO_FONT)
            run.font.size = Pt(9.5)
        elif chunk.startswith("*") and chunk.endswith("*") and len(chunk) > 2:
            run = paragraph.add_run(chunk[1:-1])
            run.italic = True
            set_run_font(run)
        else:
            run = paragraph.add_run(chunk)
            set_run_font(run)


def flush_table(doc, rows):
    if not rows:
        return
    cols = max(len(row) for row in rows)
    table = doc.add_table(rows=0, cols=cols)
    table.style = "Table Grid"
    for index, row in enumerate(rows):
        cells = table.add_row().cells
        for col in range(cols):
            cell = cells[col]
            cell.text = ""
            paragraph = cell.paragraphs[0]
            add_inline(paragraph, row[col] if col < len(row) else "")
            for run in paragraph.runs:
                run.font.size = Pt(9)
                if index == 0:
                    run.bold = True
    doc.add_paragraph()


def append_screenshots(doc):
    folder = REPO_ROOT / "delivery" / "test-evidence" / "screenshots"
    files = sorted(p.name for p in folder.glob("*.png")) if folder.is_dir() else []
    if not files:
        return 0
    doc.add_page_break()
    doc.add_heading("附录 · 页面截图（真实运行，非示意图）", level=1)
    lead = doc.add_paragraph()
    add_inline(
        lead,
        "以下截图全部来自真实运行的开发服务器：桌面端 1440×900，移动端 390×844（2x）。"
        "截图中的界面即实际交付形态。",
    )
    for name in files:
        key = name[:-4]
        doc.add_picture(str(folder / name), width=Inches(6.1))
        doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
        note = doc.add_paragraph()
        note.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = note.add_run(f"{key}　{CAPTIONS.get(key, key)}")
        set_run_font(run)
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(0x73, 0x6D, 0x65)
    return len(files)


def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 2 else REPO_ROOT / "delivery/docs/作品开发文档.md"
    target = Path(sys.argv[2]) if len(sys.argv) > 2 else REPO_ROOT / "delivery/docs/作品开发文档.docx"

    doc = Document()
    set_style_font(doc.styles["Normal"], BODY_FONT, Pt(10.5))
    for name, size in (("Title", 22), ("Heading 1", 16), ("Heading 2", 13.5), ("Heading 3", 12), ("Heading 4", 11)):
        if name in [style.name for style in doc.styles]:
            set_style_font(doc.styles[name], BODY_FONT, Pt(size), bold=True, color=RGBColor(0x1A, 0x19, 0x17))

    lines = source.read_text(encoding="utf-8").splitlines()
    table_rows = []
    images = 0
    index = 0
    while index < len(lines):
        stripped = lines[index].strip()

        if stripped.startswith("|"):
            body = stripped.strip("|")
            table_rows.append([cell.strip() for cell in body.split("|")])
            index += 1
            continue
        if table_rows:
            flush_table(doc, table_rows)
            table_rows = []

        if not stripped:
            index += 1
            continue

        image = re.match(r"^!\[(.*?)\]\((.*?)\)$", stripped)
        if image:
            caption, path = image.group(1), image.group(2)
            full = Path(path) if os.path.isabs(path) else source.parent / path
            if full.exists():
                doc.add_picture(str(full), width=Inches(6.1))
                doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
                note = doc.add_paragraph()
                note.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = note.add_run(f"图 {images + 1}　{caption}")
                set_run_font(run)
                run.font.size = Pt(9)
                images += 1
            index += 1
            continue

        heading = re.match(r"^(#{1,6})\s+(.*)$", stripped)
        if heading:
            level = len(heading.group(1))
            text = heading.group(2).strip()
            if level == 1 and not doc.paragraphs:
                doc.add_heading(text, level=0)
            else:
                doc.add_heading(text, level=min(level, 4))
            index += 1
            continue

        if stripped.startswith(">"):
            paragraph = doc.add_paragraph()
            paragraph.paragraph_format.left_indent = Inches(0.3)
            add_inline(paragraph, stripped.lstrip("> ").strip())
            for run in paragraph.runs:
                run.italic = True
                run.font.color.rgb = RGBColor(0x4A, 0x46, 0x41)
            index += 1
            continue

        bullet = re.match(r"^([-*+])\s+(.*)$", stripped)
        if bullet:
            text = bullet.group(2)
            if text.startswith("[ ] "):
                text = "☐ " + text[4:]
            elif text.lower().startswith("[x] "):
                text = "☑ " + text[4:]
            add_inline(doc.add_paragraph(style="List Bullet"), text)
            index += 1
            continue

        ordered = re.match(r"^\d+\.\s+(.*)$", stripped)
        if ordered:
            add_inline(doc.add_paragraph(style="List Number"), ordered.group(1))
            index += 1
            continue

        if stripped in ("---", "***", "___"):
            index += 1
            continue

        add_inline(doc.add_paragraph(), stripped)
        index += 1

    if table_rows:
        flush_table(doc, table_rows)

    shots = append_screenshots(doc)
    doc.save(str(target))
    print(f"已生成 {target}（正文内图片 {images} 张，附录截图 {shots} 张）")


if __name__ == "__main__":
    main()
