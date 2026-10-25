#!/usr/bin/env python3
"""Acquire and deeply verify the unmodified official Pretendard v1.3.9 subsets.

Normal builds/checks use build-fonts.js and need only Node. This maintenance
script needs fonttools[woff]==4.60.2. Use --download to restore missing vendor
files; --check verifies geometry/variation/coverage without writing outputs.
"""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import subprocess
import urllib.request

import fontTools
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen

ROOT = Path(__file__).resolve().parent.parent
DIRECTORY = ROOT / "assets/fonts/subsets"
MANIFEST = ROOT / "assets/fonts/font-manifest.json"
SOURCE = ROOT / "assets/fonts/PretendardVariable.woff2"
LICENSE = ROOT / "assets/fonts/PRETENDARD-OFL.txt"
UPSTREAM_CSS = DIRECTORY / "upstream-v1.3.9.css"
BASE_URL = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/variable/"
SOURCE_HASH = "9599f12fd42fc0bce1cd50b47a0c022e108d7aa64dd0d1bb0ed44f3282d900b4"
CSS_HASH = "2973bcae80262dcb630cfb793fbf6af29bd986c769ee54953fb3e5b3e32323ca"


def digest(value):
    return hashlib.sha256(value).hexdigest()


def asset(file, url=None):
    data = file.read_bytes()
    entry = {"path": file.relative_to(ROOT).as_posix(), "bytes": len(data), "sha256": digest(data)}
    if url:
        entry["sourceUrl"] = url
    return entry


def ranges(points):
    groups = []
    for point in sorted(points):
        if groups and point == groups[-1][1] + 1:
            groups[-1][1] = point
        else:
            groups.append([point, point])
    return ", ".join(f"U+{first:X}" if first == last else f"U+{first:X}-{last:X}" for first, last in groups)


def points_from_ranges(value):
    points = set()
    for part in value.split(","):
        pair = part.strip()[2:].split("-")
        points.update(range(int(pair[0], 16), int(pair[-1], 16) + 1))
    return points


def coverage(points):
    return {"unicodeRange": ranges(points), "codepointCount": len(points),
            "codepointsHash": digest(",".join(f"{code:X}" for code in sorted(points)).encode())}


def axes(font):
    return [{"tag": axis.axisTag, "min": axis.minValue, "default": axis.defaultValue, "max": axis.maxValue}
            for axis in font["fvar"].axes]


def metrics(font):
    return {"unitsPerEm": font["head"].unitsPerEm,
            "ascent": font["hhea"].ascent, "descent": font["hhea"].descent,
            "lineGap": font["hhea"].lineGap}


def unicode_cmap(font):
    result = {}
    for table in font["cmap"].tables:
        if table.isUnicode():
            for point, name in table.cmap.items():
                if point in result and result[point] != name:
                    raise ValueError(f"Conflicting Unicode mappings: U+{point:X}")
                result[point] = name
    return result


def geometry(font, glyphs, name):
    pen = DecomposingRecordingPen(glyphs)
    glyphs[name].draw(pen)
    return (pen.value, font["hmtx"][name],
            [(variation.axes, variation.coordinates) for variation in font["gvar"].variations.get(name, [])])


def download(file, url, expected=None):
    if file.exists():
        data = file.read_bytes()
        if expected is None or digest(data) == expected:
            return
    data = urllib.request.urlopen(url, timeout=60).read()
    if expected is not None and digest(data) != expected:
        raise ValueError(f"Upstream checksum mismatch: {url}")
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_bytes(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true", help="Restore official vendor files with pinned checksums")
    parser.add_argument("--check", action="store_true", help="Verify exact outlines, variations, axes, metrics, and complete Unicode coverage")
    args = parser.parse_args()
    if fontTools.__version__ != "4.60.2":
        raise ValueError("Deep font verification requires fonttools[woff]==4.60.2")
    if digest(SOURCE.read_bytes()) != SOURCE_HASH:
        raise ValueError("Original font differs from the verified official v1.3.9 source; re-evaluate the font split")
    previous = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else None
    if args.download:
        download(UPSTREAM_CSS, BASE_URL + "pretendardvariable-dynamic-subset.css", CSS_HASH)
    css = UPSTREAM_CSS.read_text()
    if digest(UPSTREAM_CSS.read_bytes()) != CSS_HASH:
        raise ValueError("Official upstream CSS checksum differs")
    specs = []
    for block in css.split("@font-face")[1:]:
        name = re.search(r"url\(\./woff2-dynamic-subset/([^\)]+)\)", block).group(1)
        unicode_range = re.search(r"unicode-range:\s*([^;]+)", block).group(1)
        specs.append((name, points_from_ranges(unicode_range)))
    if args.download:
        known = {Path(entry["path"]).name: entry["sha256"] for entry in previous["subsets"]} if previous else {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            futures = [executor.submit(download, DIRECTORY / name, BASE_URL + "woff2-dynamic-subset/" + name, known.get(name)) for name, _ in specs]
            for future in futures:
                future.result()

    original = TTFont(SOURCE)
    original_cmap = unicode_cmap(original)
    original_glyphs = original.getGlyphSet()
    original_geometry = {}
    covered = set()
    subset_records = []
    geometry_count = 0
    for name, declared_points in specs:
        file = DIRECTORY / name
        font = TTFont(file)
        if axes(font) != axes(original) or metrics(font) != metrics(original):
            raise ValueError(f"Axis or font metrics changed: {name}")
        cmap = unicode_cmap(font)
        effective = set(cmap) & declared_points
        if effective - original_cmap.keys() or effective & covered:
            raise ValueError(f"Unsupported or duplicate character coverage: {name}")
        glyphs = font.getGlyphSet()
        outline_digest = hashlib.sha256()
        for point in sorted(effective):
            source_name = original_cmap[point]
            if source_name not in original_geometry:
                original_geometry[source_name] = geometry(original, original_glyphs, source_name)
            expected = original_geometry[source_name]
            actual = geometry(font, glyphs, cmap[point])
            if actual != expected:
                raise ValueError(f"Glyph outline, width, or variable deltas changed: {name}, U+{point:X}")
            outline_digest.update(json.dumps([point, actual], separators=(",", ":"), sort_keys=True).encode())
            geometry_count += 1
        record = asset(file, BASE_URL + "woff2-dynamic-subset/" + name)
        record.update(coverage(effective))
        record.update({"axes": axes(font), "geometryHash": outline_digest.hexdigest()})
        subset_records.append(record)
        covered.update(effective)
        font.close()

    missing = set(original_cmap) - covered
    source = asset(SOURCE, BASE_URL + "woff2/PretendardVariable.woff2")
    source.update(coverage(set(original_cmap)))
    source.update({"axes": axes(original), "metrics": metrics(original)})
    payload = {
        "version": 1, "family": "Studio Pretendard", "cssWeight": [45, 920], "display": "block",
        "upstream": {"release": "v1.3.9", "repository": "https://github.com/orioncactus/pretendard",
                     "css": asset(UPSTREAM_CSS, BASE_URL + "pretendardvariable-dynamic-subset.css")},
        "source": source, "license": asset(LICENSE), "subsets": subset_records,
        "fallback": {"path": source["path"], **coverage(missing)},
        "verification": {"fontTools": fontTools.__version__, "mappedGlyphsCompared": geometry_count,
                         "method": "Exact decomposed default outlines, horizontal metrics, and all gvar support regions/deltas; identical axes and vertical metrics"}
    }
    serialized = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not MANIFEST.exists() or MANIFEST.read_text() != serialized:
            raise ValueError("Font manifest differs from verified font files; rebuild with scripts/build-fonts.py")
    else:
        MANIFEST.write_text(serialized)
        subprocess.run(["node", str(ROOT / "scripts/build-fonts.js")], check=True)
    print(f"Deep font verification passed: {geometry_count} exact variable glyphs; {len(missing)} remaining characters use the unchanged original; {len(original_cmap)} total characters.")


if __name__ == "__main__":
    main()
