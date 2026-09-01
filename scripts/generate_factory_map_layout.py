#!/usr/bin/env python3
"""Rebuild css-map layout from the annotated factory workbook and device master."""

from __future__ import annotations

import argparse
import copy
import io
import json
import math
import posixpath
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

import numpy as np
from PIL import Image, ImageDraw, ImageFont


SHEET_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
ART_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
EMU_PER_PIXEL = 9525
LAYOUT_COORDINATE_SYSTEM = "factory-floorplan-v1"
LABEL_PATTERN = re.compile(r"[A-Z①②③④⑤⑥⑦⑧⑨]")
STI_CODE_PATTERN = re.compile(r"^(?:STI375|STI450(?:VX|MVX)?)-([0-9][A-Z][0-9]{2})$")
SECTION_LABEL_KEYS = {
    "pretreatment1": "cssMap.focus.processes.pretreatment1",
    "vulcanization1": "cssMap.focus.processes.vulcanization1",
    "posttreatment1": "cssMap.focus.processes.posttreatment1",
    "pretreatment2": "cssMap.focus.processes.pretreatment2",
    "vulcanization2": "cssMap.focus.processes.vulcanization2",
    "posttreatment2": "cssMap.focus.processes.posttreatment2",
}
SECTION_COLORS = {
    "pretreatment1": "#ffcf78",
    "vulcanization1": "#78d6ff",
    "posttreatment1": "#9edb8a",
    "pretreatment2": "#ffcf78",
    "vulcanization2": "#78d6ff",
    "posttreatment2": "#9edb8a",
}
PROCESS_MAP = {
    ("first_workshop", "preprocessing"): "pretreatment1",
    ("first_workshop", "sulfur_addition"): "vulcanization1",
    ("first_workshop", "post_processing"): "posttreatment1",
    ("second_workshop", "preprocessing"): "pretreatment2",
    ("second_workshop", "sulfur_addition"): "vulcanization2",
    ("second_workshop", "post_processing"): "posttreatment2",
}
EXPECTED_REGION_LABELS = {
    "factory1": set("ABCDEFGHIJKLMNOPQRSTUVWXYZ") | set("①②③④⑤⑥⑦⑧⑨"),
    "factory2": set("①②③④⑤"),
}


@dataclass(frozen=True)
class Rect:
    x: float
    y: float
    width: float
    height: float

    @property
    def right(self) -> float:
        return self.x + self.width

    @property
    def bottom(self) -> float:
        return self.y + self.height

    @property
    def center(self) -> tuple[float, float]:
        return (self.x + self.width / 2, self.y + self.height / 2)

    @property
    def area(self) -> float:
        return max(self.width, 0) * max(self.height, 0)

    def inset(self, x_ratio: float, y_ratio: float | None = None) -> "Rect":
        y_ratio = x_ratio if y_ratio is None else y_ratio
        dx = min(self.width * x_ratio, self.width / 3)
        dy = min(self.height * y_ratio, self.height / 3)
        return Rect(self.x + dx, self.y + dy, max(self.width - 2 * dx, 1), max(self.height - 2 * dy, 1))

    def rounded(self, digits: int = 2) -> "Rect":
        return Rect(*(round(value, digits) for value in (self.x, self.y, self.width, self.height)))


@dataclass(frozen=True)
class SheetGeometry:
    column_widths: tuple[float, ...]
    row_heights: tuple[float, ...]

    def point(self, marker: ET.Element) -> tuple[float, float]:
        col = int(marker.findtext(f"{{{DRAWING_NS}}}col", "0"))
        row = int(marker.findtext(f"{{{DRAWING_NS}}}row", "0"))
        col_offset = int(marker.findtext(f"{{{DRAWING_NS}}}colOff", "0")) / EMU_PER_PIXEL
        row_offset = int(marker.findtext(f"{{{DRAWING_NS}}}rowOff", "0")) / EMU_PER_PIXEL
        return (sum(self.column_widths[:col]) + col_offset, sum(self.row_heights[:row]) + row_offset)

    def column_center(self, index: int) -> float:
        return sum(self.column_widths[:index]) + self.column_widths[index] / 2


@dataclass(frozen=True)
class SheetModel:
    name: str
    part: str
    root: ET.Element
    cells: dict[int, dict[int, str]]
    geometry: SheetGeometry
    drawing_part: str | None


@dataclass(frozen=True)
class WorkbookModel:
    path: Path
    sheets: dict[str, SheetModel]


@dataclass(frozen=True)
class DrawingObject:
    kind: str
    name: str
    text: str
    rect: Rect
    line_colors: tuple[str, ...]
    image_part: str | None = None
    image_size: tuple[int, int] | None = None


@dataclass(frozen=True)
class FactoryMapping:
    factory_id: str
    sheet: SheetModel
    picture: DrawingObject
    image_ink_bbox: Rect
    target_pixel_bbox: Rect
    output_scale: float
    map_size: tuple[float, float]

    def drawing_x_to_map(self, drawing_x: float) -> float:
        image_x = (drawing_x - self.picture.rect.x) * self.picture.image_size[0] / self.picture.rect.width
        return self.image_x_to_map(image_x)

    def image_x_to_map(self, image_x: float) -> float:
        ratio = (image_x - self.image_ink_bbox.x) / self.image_ink_bbox.width
        return (self.target_pixel_bbox.x + ratio * self.target_pixel_bbox.width) / self.output_scale

    def image_y_to_map(self, image_y: float) -> float:
        ratio = (image_y - self.image_ink_bbox.y) / self.image_ink_bbox.height
        return (self.target_pixel_bbox.y + ratio * self.target_pixel_bbox.height) / self.output_scale

    def drawing_rect_to_map(self, rect: Rect) -> Rect:
        image_x0 = (rect.x - self.picture.rect.x) * self.picture.image_size[0] / self.picture.rect.width
        image_y0 = (rect.y - self.picture.rect.y) * self.picture.image_size[1] / self.picture.rect.height
        image_x1 = (rect.right - self.picture.rect.x) * self.picture.image_size[0] / self.picture.rect.width
        image_y1 = (rect.bottom - self.picture.rect.y) * self.picture.image_size[1] / self.picture.rect.height
        x0 = self.image_x_to_map(image_x0)
        y0 = self.image_y_to_map(image_y0)
        x1 = self.image_x_to_map(image_x1)
        y1 = self.image_y_to_map(image_y1)
        map_width, map_height = self.map_size
        x0 = min(max(x0, 0), map_width)
        y0 = min(max(y0, 0), map_height)
        x1 = min(max(x1, 0), map_width)
        y1 = min(max(y1, 0), map_height)
        return Rect(min(x0, x1), min(y0, y1), abs(x1 - x0), abs(y1 - y0))

    @property
    def target_map_bbox(self) -> Rect:
        return Rect(
            self.target_pixel_bbox.x / self.output_scale,
            self.target_pixel_bbox.y / self.output_scale,
            self.target_pixel_bbox.width / self.output_scale,
            self.target_pixel_bbox.height / self.output_scale,
        )


@dataclass(frozen=True)
class DeviceRecord:
    factory_id: str
    section: str
    row: int
    region: str
    plate_name: str
    system_name: str
    code: str
    inferred_code: bool


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--layout", required=True, type=Path)
    parser.add_argument("--device-master", required=True, type=Path)
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--floorplan-image", required=True, type=Path)
    parser.add_argument("--floorplan-metadata", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--preview", type=Path)
    parser.add_argument("--allow-inferred-codes", action="store_true")
    parser.add_argument("--soffice", default="soffice")
    return parser.parse_args()


def relationship_part(part: str) -> str:
    return posixpath.join(posixpath.dirname(part), "_rels", posixpath.basename(part) + ".rels")


def resolve_part(base_part: str, target: str) -> str:
    if target.startswith("/"):
        return target.lstrip("/")
    return posixpath.normpath(posixpath.join(posixpath.dirname(base_part), target))


def read_relationships(archive: zipfile.ZipFile, part: str) -> dict[str, str]:
    rel_part = relationship_part(part)
    if rel_part not in archive.namelist():
        return {}
    root = ET.fromstring(archive.read(rel_part))
    return {
        item.attrib["Id"]: resolve_part(part, item.attrib["Target"])
        for item in root.findall(f"{{{PACKAGE_REL_NS}}}Relationship")
    }


def column_index(cell_reference: str) -> int:
    letters = re.match(r"[A-Z]+", cell_reference)
    if not letters:
        raise ValueError(f"Invalid cell reference: {cell_reference}")
    value = 0
    for character in letters.group(0):
        value = value * 26 + ord(character) - 64
    return value - 1


def excel_column_pixels(width: float) -> float:
    if width <= 0:
        return 0
    if width < 1:
        return math.floor(width * 12 + 0.5)
    return math.floor(((256 * width + math.floor(128 / 7)) / 256) * 7) + 5


def parse_sheet_geometry(root: ET.Element, max_columns: int = 64, max_rows: int = 128) -> SheetGeometry:
    format_node = root.find(f"{{{SHEET_NS}}}sheetFormatPr")
    default_column = float(format_node.attrib.get("defaultColWidth", "8.43")) if format_node is not None else 8.43
    default_row = float(format_node.attrib.get("defaultRowHeight", "15")) if format_node is not None else 15
    columns = [excel_column_pixels(default_column) for _ in range(max_columns)]
    rows = [default_row * 96 / 72 for _ in range(max_rows)]

    cols_node = root.find(f"{{{SHEET_NS}}}cols")
    if cols_node is not None:
        for item in cols_node.findall(f"{{{SHEET_NS}}}col"):
            width = 0 if item.attrib.get("hidden") == "1" else excel_column_pixels(float(item.attrib.get("width", default_column)))
            for index in range(int(item.attrib["min"]) - 1, min(int(item.attrib["max"]), max_columns)):
                columns[index] = width

    sheet_data = root.find(f"{{{SHEET_NS}}}sheetData")
    if sheet_data is not None:
        for item in sheet_data.findall(f"{{{SHEET_NS}}}row"):
            index = int(item.attrib["r"]) - 1
            if index >= max_rows:
                continue
            if item.attrib.get("hidden") == "1":
                rows[index] = 0
            elif "ht" in item.attrib:
                rows[index] = float(item.attrib["ht"]) * 96 / 72
    return SheetGeometry(tuple(columns), tuple(rows))


def cell_value(cell: ET.Element, shared_strings: Sequence[str]) -> str:
    value = cell.find(f"{{{SHEET_NS}}}v")
    cell_type = cell.attrib.get("t")
    if cell_type == "s" and value is not None:
        return shared_strings[int(value.text)]
    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.iter(f"{{{SHEET_NS}}}t"))
    return value.text if value is not None and value.text is not None else ""


def load_workbook(path: Path) -> WorkbookModel:
    with zipfile.ZipFile(path) as archive:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared_strings = [
                "".join(node.text or "" for node in item.iter(f"{{{SHEET_NS}}}t"))
                for item in root.findall(f"{{{SHEET_NS}}}si")
            ]

        workbook_part = "xl/workbook.xml"
        workbook_root = ET.fromstring(archive.read(workbook_part))
        workbook_relationships = read_relationships(archive, workbook_part)
        sheets: dict[str, SheetModel] = {}
        for item in workbook_root.findall(f"{{{SHEET_NS}}}sheets/{{{SHEET_NS}}}sheet"):
            name = item.attrib["name"]
            relation_id = item.attrib[f"{{{REL_NS}}}id"]
            part = workbook_relationships[relation_id]
            root = ET.fromstring(archive.read(part))
            rows: dict[int, dict[int, str]] = defaultdict(dict)
            for cell in root.findall(f".//{{{SHEET_NS}}}c"):
                reference = cell.attrib["r"]
                row_match = re.search(r"[0-9]+", reference)
                if row_match is None:
                    continue
                rows[int(row_match.group())][column_index(reference)] = cell_value(cell, shared_strings)

            drawing_part = None
            drawing = root.find(f"{{{SHEET_NS}}}drawing")
            if drawing is not None:
                sheet_relationships = read_relationships(archive, part)
                drawing_part = sheet_relationships.get(drawing.attrib[f"{{{REL_NS}}}id"])
            sheets[name] = SheetModel(
                name=name,
                part=part,
                root=root,
                cells=dict(rows),
                geometry=parse_sheet_geometry(root),
                drawing_part=drawing_part,
            )
    return WorkbookModel(path=path, sheets=sheets)


def anchor_rect(anchor: ET.Element, geometry: SheetGeometry) -> Rect:
    start = anchor.find(f"{{{DRAWING_NS}}}from")
    if start is None:
        raise ValueError("Drawing anchor has no start marker")
    x0, y0 = geometry.point(start)
    end = anchor.find(f"{{{DRAWING_NS}}}to")
    if end is not None:
        x1, y1 = geometry.point(end)
        return Rect(min(x0, x1), min(y0, y1), abs(x1 - x0), abs(y1 - y0))
    extent = anchor.find(f"{{{DRAWING_NS}}}ext")
    if extent is None:
        raise ValueError("One-cell drawing anchor has no extent")
    return Rect(x0, y0, int(extent.attrib["cx"]) / EMU_PER_PIXEL, int(extent.attrib["cy"]) / EMU_PER_PIXEL)


def load_drawing_objects(workbook: WorkbookModel, sheet: SheetModel) -> list[DrawingObject]:
    if sheet.drawing_part is None:
        return []
    with zipfile.ZipFile(workbook.path) as archive:
        root = ET.fromstring(archive.read(sheet.drawing_part))
        relationships = read_relationships(archive, sheet.drawing_part)
        objects: list[DrawingObject] = []
        for anchor in list(root):
            shape = anchor.find(f"{{{DRAWING_NS}}}sp")
            picture = anchor.find(f"{{{DRAWING_NS}}}pic")
            if shape is None and picture is None:
                continue
            non_visual = anchor.find(f".//{{{DRAWING_NS}}}cNvPr")
            name = non_visual.attrib.get("name", "") if non_visual is not None else ""
            text = "".join(node.text or "" for node in anchor.findall(f".//{{{ART_NS}}}t"))
            colors = tuple(
                node.attrib.get("val", "").upper()
                for node in anchor.findall(f".//{{{ART_NS}}}ln//{{{ART_NS}}}srgbClr")
            )
            image_part = None
            image_size = None
            kind = "shape"
            if picture is not None:
                kind = "picture"
                blip = anchor.find(f".//{{{ART_NS}}}blip")
                if blip is not None:
                    image_part = relationships.get(blip.attrib.get(f"{{{REL_NS}}}embed", ""))
                if image_part:
                    with Image.open(io.BytesIO(archive.read(image_part))) as image:
                        image_size = image.size
            objects.append(
                DrawingObject(
                    kind=kind,
                    name=name,
                    text=text.strip(),
                    rect=anchor_rect(anchor, sheet.geometry),
                    line_colors=colors,
                    image_part=image_part,
                    image_size=image_size,
                )
            )
        return objects


def rect_distance(point: tuple[float, float], rect: Rect) -> float:
    x, y = point
    dx = max(rect.x - x, 0, x - rect.right)
    dy = max(rect.y - y, 0, y - rect.bottom)
    center_dx = x - rect.center[0]
    center_dy = y - rect.center[1]
    if dx == 0 and dy == 0:
        return math.hypot(center_dx, center_dy) / max(math.sqrt(rect.area), 1) * 0.01
    return math.hypot(dx, dy) + math.hypot(center_dx, center_dy) * 0.001


def pair_regions(objects: Sequence[DrawingObject]) -> dict[str, DrawingObject]:
    regions = [item for item in objects if item.kind == "shape" and "FF0000" in item.line_colors]
    labels = [item for item in objects if item.kind == "shape" and LABEL_PATTERN.fullmatch(item.text)]
    if len(regions) != len(labels):
        raise ValueError(f"Region/label count mismatch: {len(regions)} regions, {len(labels)} labels")
    remaining = list(regions)
    result: dict[str, DrawingObject] = {}
    for label in labels:
        region = min(remaining, key=lambda candidate: rect_distance(label.rect.center, candidate.rect))
        result[label.text] = region
        remaining.remove(region)
    if len(result) != len(labels):
        raise ValueError("Duplicate region labels found")
    return result


def image_ink_bbox(image: Image.Image) -> Rect:
    rgb = np.asarray(image.convert("RGB"))
    mask = np.min(rgb, axis=2) < 248
    y, x = np.where(mask)
    if len(x) == 0:
        raise ValueError("Embedded layout image has no visible linework")
    return Rect(float(x.min()), float(y.min()), float(x.max() - x.min() + 1), float(y.max() - y.min() + 1))


def target_alpha_bbox(image: Image.Image, placement: dict[str, float]) -> Rect:
    x = int(placement["x"])
    y = int(placement["y"])
    width = int(placement["width"])
    height = int(placement["height"])
    alpha = np.asarray(image.convert("RGBA"))[y:y + height, x:x + width, 3]
    row, col = np.where(alpha > 3)
    if len(col) == 0:
        raise ValueError("Generated floorplan placement has no alpha linework")
    return Rect(
        float(x + col.min()),
        float(y + row.min()),
        float(col.max() - col.min() + 1),
        float(row.max() - row.min() + 1),
    )


def build_factory_mapping(
    workbook: WorkbookModel,
    sheet_name: str,
    factory_id: str,
    floorplan: Image.Image,
    metadata: dict[str, object],
) -> tuple[FactoryMapping, dict[str, Rect]]:
    sheet = workbook.sheets[sheet_name]
    objects = load_drawing_objects(workbook, sheet)
    pictures = [item for item in objects if item.kind == "picture" and item.image_part and item.image_size]
    if not pictures:
        raise ValueError(f"No layout picture found on sheet {sheet_name}")
    picture = max(pictures, key=lambda item: item.image_size[0] * item.image_size[1])
    with zipfile.ZipFile(workbook.path) as archive, Image.open(io.BytesIO(archive.read(picture.image_part))) as image:
        image.load()
        ink_bbox = image_ink_bbox(image)

    factory_metadata = next(item for item in metadata["factories"] if item["id"] == factory_id)
    placement = factory_metadata["placementPixel"]
    mapping = FactoryMapping(
        factory_id=factory_id,
        sheet=sheet,
        picture=picture,
        image_ink_bbox=ink_bbox,
        target_pixel_bbox=target_alpha_bbox(floorplan, placement),
        output_scale=float(metadata["outputScale"]),
        map_size=(float(metadata["mapSize"]["width"]), float(metadata["mapSize"]["height"])),
    )
    paired_regions = pair_regions(objects)
    expected_labels = EXPECTED_REGION_LABELS[factory_id]
    if set(paired_regions) != expected_labels:
        missing = sorted(expected_labels - set(paired_regions))
        extra = sorted(set(paired_regions) - expected_labels)
        raise ValueError(f"Unexpected region labels on {sheet_name}: missing={missing}, extra={extra}")
    regions = {
        label: mapping.drawing_rect_to_map(item.rect).rounded()
        for label, item in paired_regions.items()
    }
    return mapping, regions


def convert_master_to_xlsx(path: Path, soffice: str, temp_dir: Path) -> Path:
    if path.suffix.lower() == ".xlsx":
        return path
    profile = (temp_dir / "libreoffice-profile").resolve().as_uri()
    subprocess.run(
        [
            soffice,
            f"-env:UserInstallation={profile}",
            "--headless",
            "--convert-to",
            "xlsx",
            "--outdir",
            str(temp_dir),
            str(path),
        ],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    converted = temp_dir / f"{path.stem}.xlsx"
    if not converted.exists():
        raise FileNotFoundError(f"LibreOffice did not produce {converted}")
    return converted


def master_indexes(master: WorkbookModel) -> tuple[dict[str, list[dict[str, str]]], dict[str, dict[str, str]]]:
    sheet = next(iter(master.sheets.values()))
    by_name: dict[str, list[dict[str, str]]] = defaultdict(list)
    by_code: dict[str, dict[str, str]] = {}
    for row_index, row in sheet.cells.items():
        if row_index == 1:
            continue
        code = row.get(1, "").strip()
        name = row.get(2, "").strip()
        if not code or not name:
            continue
        item = {
            "code": code,
            "name": name,
            "factory": row.get(4, "").strip(),
            "process": row.get(6, "").strip(),
        }
        by_name[name].append(item)
        by_code[code.upper()] = item
    return dict(by_name), by_code


def resolve_code(system_name: str, by_name: dict[str, list[dict[str, str]]], allow_inferred: bool) -> tuple[str, bool]:
    matches = by_name.get(system_name, [])
    if len(matches) == 1:
        return matches[0]["code"].upper(), False
    if len(matches) > 1:
        raise ValueError(f"Ambiguous device name in master: {system_name}")
    match = STI_CODE_PATTERN.fullmatch(system_name)
    if match and allow_inferred:
        return match.group(1).upper(), True
    raise ValueError(f"Device is missing from master: {system_name}")


def load_device_records(
    workbook: WorkbookModel,
    by_name: dict[str, list[dict[str, str]]],
    allow_inferred: bool,
) -> list[DeviceRecord]:
    records: list[DeviceRecord] = []
    first_sheet = workbook.sheets["1工场设备"]
    for row_index in sorted(first_sheet.cells):
        if row_index < 2:
            continue
        row = first_sheet.cells[row_index]
        region = row.get(3, "").strip()
        system_name = row.get(5, "").strip()
        if not region or not system_name:
            continue
        process_text = row.get(2, "").strip()
        if process_text == "加硫":
            section = "vulcanization1"
        elif process_text == "后处理":
            section = "posttreatment1"
        elif process_text == "前处理":
            section = "pretreatment1"
        else:
            raise ValueError(f"Unknown process on 1工场设备 row {row_index}: {process_text}")
        code, inferred = resolve_code(system_name, by_name, allow_inferred)
        records.append(DeviceRecord("factory1", section, row_index, region, row.get(4, "").strip(), system_name, code, inferred))

    second_sheet = workbook.sheets["2工场"]
    for row_index in sorted(second_sheet.cells):
        if row_index < 14:
            continue
        row = second_sheet.cells[row_index]
        region = row.get(1, "").strip()
        system_name = row.get(3, "").strip()
        if not region or not system_name:
            continue
        code, inferred = resolve_code(system_name, by_name, allow_inferred)
        records.append(DeviceRecord("factory2", "vulcanization2", row_index, region, row.get(2, "").strip(), system_name, code, inferred))

    duplicates = [code for code, count in _counts(item.code for item in records).items() if count > 1]
    if duplicates:
        raise ValueError(f"Duplicate codes in layout workbook: {duplicates}")
    return records


def _counts(values: Iterable[str]) -> dict[str, int]:
    result: dict[str, int] = defaultdict(int)
    for value in values:
        result[value] += 1
    return dict(result)


def existing_code_info(config: dict[str, object]) -> dict[str, dict[str, str]]:
    result: dict[str, dict[str, str]] = {}
    for device in config["devices"]:
        code = str(device.get("deviceCode", "")).strip().upper()
        if code:
            result[code] = {"id": device["id"], "name": device["name"]}
        for child in device.get("children", []):
            child_code = str(child.get("deviceCode", "")).strip().upper()
            if child_code:
                result[child_code] = {"id": child["id"], "name": child["name"]}
    return result


def factory_for_device(device: dict[str, object], split_y: float) -> str:
    """Keep non-annotated devices in the factory selected by the reviewed map config.

    The master workbook is authoritative for resolving a device name to its unique
    code, but it does not contain surveyed coordinates. Moving a retained device to
    another factory from master metadata would therefore invent a position that is
    absent from the site annotations.
    """
    section = device.get("section")
    if isinstance(section, str) and section[-1:] in {"1", "2"}:
        return f"factory{section[-1]}"
    center_y = float(device["y"]) + float(device["height"]) / 2
    return "factory1" if center_y < split_y else "factory2"


def section_factory_bounds(config: dict[str, object], factory_id: str) -> Rect:
    suffix = factory_id[-1]
    points = [
        point
        for section in config["sections"]
        if str(section["id"]).endswith(suffix)
        for point in section["points"]
    ]
    return Rect(
        min(float(point["x"]) for point in points),
        min(float(point["y"]) for point in points),
        max(float(point["x"]) for point in points) - min(float(point["x"]) for point in points),
        max(float(point["y"]) for point in points) - min(float(point["y"]) for point in points),
    )


def map_rect_between_bounds(rect: Rect, source: Rect, target: Rect) -> Rect:
    scale_x = target.width / source.width
    scale_y = target.height / source.height
    return Rect(
        target.x + (rect.x - source.x) * scale_x,
        target.y + (rect.y - source.y) * scale_y,
        rect.width * scale_x,
        rect.height * scale_y,
    )


def transform_existing_config(
    config: dict[str, object],
    mappings: dict[str, FactoryMapping],
) -> dict[str, object]:
    if config["source"].get("layoutCoordinateSystem") == LAYOUT_COORDINATE_SYSTEM:
        return copy.deepcopy(config)

    result = copy.deepcopy(config)
    old_bounds = {factory: section_factory_bounds(config, factory) for factory in mappings}
    split_y = float(config["source"]["imageHeight"]) / 2
    for section in result["sections"]:
        factory = f"factory{str(section['id'])[-1]}"
        source = old_bounds[factory]
        target = mappings[factory].target_map_bbox
        for point in section["points"]:
            mapped = map_rect_between_bounds(Rect(float(point["x"]), float(point["y"]), 0, 0), source, target)
            point["x"] = round(mapped.x, 2)
            point["y"] = round(mapped.y, 2)

    for device in result["devices"]:
        factory = factory_for_device(device, split_y)
        source = old_bounds[factory]
        target = mappings[factory].target_map_bbox
        original = Rect(float(device["x"]), float(device["y"]), float(device["width"]), float(device["height"]))
        mapped = map_rect_between_bounds(original, source, target).rounded()
        device.update({"x": mapped.x, "y": mapped.y, "width": mapped.width, "height": mapped.height})
        if device.get("polygon"):
            scale_x = target.width / source.width
            scale_y = target.height / source.height
            for point in device["polygon"]:
                point["x"] = round(float(point["x"]) * scale_x, 2)
                point["y"] = round(float(point["y"]) * scale_y, 2)
    return result


def remove_mapped_codes(config: dict[str, object], mapped_codes: set[str]) -> tuple[list[dict[str, object]], set[str]]:
    retained: list[dict[str, object]] = []
    removed: set[str] = set()
    for source_device in config["devices"]:
        device = copy.deepcopy(source_device)
        direct_code = str(device.get("deviceCode", "")).upper()
        if direct_code and direct_code in mapped_codes:
            removed.add(direct_code)
            continue
        if device.get("children"):
            children = []
            for child in device["children"]:
                code = str(child.get("deviceCode", "")).upper()
                if code in mapped_codes:
                    removed.add(code)
                else:
                    children.append(child)
            device["children"] = children
            device["deviceCodes"] = [
                str(code).upper()
                for code in device.get("deviceCodes", [])
                if str(code).upper() not in mapped_codes
            ]
            if not children and not direct_code and not device["deviceCodes"]:
                continue
        retained.append(device)
    return retained, removed


def fill_missing_sections(
    devices: list[dict[str, object]],
    master_by_code: dict[str, dict[str, str]],
    split_y: float,
) -> tuple[int, list[dict[str, object]]]:
    """Fill only absent process metadata when master and reviewed factory agree."""
    filled = 0
    conflicts: list[dict[str, object]] = []
    for device in devices:
        if device.get("section") is not None:
            continue
        codes = []
        if device.get("deviceCode"):
            codes.append(str(device["deviceCode"]).upper())
        codes.extend(str(child["deviceCode"]).upper() for child in device.get("children", []))
        master_items = [master_by_code.get(code) for code in codes]
        if not master_items or any(item is None for item in master_items):
            continue
        sections = {
            PROCESS_MAP.get((item["factory"], item["process"]))
            for item in master_items
            if item is not None
        }
        sections.discard(None)
        if len(sections) != 1:
            continue
        section = next(iter(sections))
        reviewed_factory = factory_for_device(device, split_y)
        if section[-1] != reviewed_factory[-1]:
            conflicts.append(
                {
                    "id": str(device["id"]),
                    "codes": codes,
                    "reviewedFactory": reviewed_factory,
                    "masterSection": section,
                }
            )
            continue
        device["section"] = section
        filled += 1
    return filled, conflicts


def numeric_centers(mapping: FactoryMapping, row: int) -> dict[int, float]:
    result: dict[int, float] = {}
    for col, value in mapping.sheet.cells.get(row, {}).items():
        if value.isdigit():
            result[int(value)] = mapping.drawing_x_to_map(mapping.sheet.geometry.column_center(col))
    return result


def horizontal_slots(region: Rect, centers: Sequence[float]) -> list[Rect]:
    area = region.inset(0.015, 0.055)
    if not centers:
        return []
    sorted_centers = list(centers)
    if any(center <= area.x or center >= area.right for center in sorted_centers):
        step = area.width / len(sorted_centers)
        sorted_centers = [area.x + step * (index + 0.5) for index in range(len(sorted_centers))]
    boundaries = [area.x]
    boundaries.extend((left + right) / 2 for left, right in zip(sorted_centers, sorted_centers[1:]))
    boundaries.append(area.right)
    slots: list[Rect] = []
    for left, right in zip(boundaries, boundaries[1:]):
        gap = min(max((right - left) * 0.10, 0.8), 2.5)
        slots.append(Rect(left + gap / 2, area.y, max(right - left - gap, 1), area.height).rounded())
    return slots


def uniform_horizontal_slots(region: Rect, count: int) -> list[Rect]:
    area = region.inset(0.02, 0.055)
    step = area.width / count
    return [
        Rect(area.x + index * step + step * 0.05, area.y, step * 0.90, area.height).rounded()
        for index in range(count)
    ]


def vertical_slots(region: Rect, count: int) -> list[Rect]:
    area = region.inset(0.055, 0.02)
    step = area.height / count
    return [
        Rect(area.x, area.y + index * step + step * 0.05, area.width, step * 0.90).rounded()
        for index in range(count)
    ]


def child_id(code: str, existing: dict[str, dict[str, str]]) -> str:
    if code in existing:
        return existing[code]["id"]
    return f"device-{code.lower()}" if re.search(r"[A-Z]", code) else code


def local_child(record: DeviceRecord, slot: Rect, parent: Rect, existing: dict[str, dict[str, str]]) -> dict[str, object]:
    return {
        "id": child_id(record.code, existing),
        "name": record.system_name,
        "deviceCode": record.code,
        "x": round((slot.x - parent.x) * 100 / parent.width, 3),
        "y": round((slot.y - parent.y) * 100 / parent.height, 3),
        "width": round(slot.width * 100 / parent.width, 3),
        "height": round(slot.height * 100 / parent.height, 3),
    }


def region_slug(label: str) -> str:
    circled = {character: f"n{index}" for index, character in enumerate("①②③④⑤⑥⑦⑧⑨", 1)}
    return circled.get(label, label.lower())


def generated_layout_devices(
    records: Sequence[DeviceRecord],
    regions: dict[str, dict[str, Rect]],
    mappings: dict[str, FactoryMapping],
    existing: dict[str, dict[str, str]],
) -> list[dict[str, object]]:
    grouped: dict[tuple[str, str], list[DeviceRecord]] = defaultdict(list)
    for record in records:
        grouped[(record.factory_id, record.region)].append(record)

    first_positions = numeric_centers(mappings["factory1"], 19)
    second_a_positions = numeric_centers(mappings["factory2"], 1)
    second_b_positions = numeric_centers(mappings["factory2"], 12)
    explicit_centers: dict[tuple[str, str], list[float]] = {}
    for left, right in [("①", "②"), ("③", "④"), ("⑤", "⑥")]:
        left_count = len(grouped[("factory1", left)])
        right_count = len(grouped[("factory1", right)])
        explicit_centers[("factory1", left)] = [first_positions[index] for index in range(1, left_count + 1)]
        explicit_centers[("factory1", right)] = [first_positions[index] for index in range(left_count + 1, left_count + right_count + 1)]
    for factory_id, labels, positions in [
        ("factory2", ["①", "②"], second_a_positions),
        ("factory2", ["③", "④", "⑤"], second_b_positions),
    ]:
        offset = 0
        for label in labels:
            count = len(grouped[(factory_id, label)])
            explicit_centers[(factory_id, label)] = [positions[index] for index in range(offset + 1, offset + count + 1)]
            offset += count

    output: list[dict[str, object]] = []
    for (factory_id, label), items in grouped.items():
        parent = regions[factory_id][label]
        if len(items) == 1:
            slot = parent.inset(0.035).rounded()
            item = items[0]
            output.append(
                {
                    "id": child_id(item.code, existing),
                    "name": item.system_name,
                    "x": slot.x,
                    "y": slot.y,
                    "width": slot.width,
                    "height": slot.height,
                    "section": item.section,
                    "deviceCode": item.code,
                }
            )
            continue

        if (factory_id, label) in explicit_centers:
            slots = horizontal_slots(parent, explicit_centers[(factory_id, label)])
        elif parent.width >= parent.height:
            slots = uniform_horizontal_slots(parent, len(items))
        else:
            slots = vertical_slots(parent, len(items))
        if len(slots) != len(items):
            raise ValueError(f"Slot count mismatch for {factory_id} {label}")
        section = items[0].section
        output.append(
            {
                "id": f"layout-{factory_id}-region-{region_slug(label)}",
                "name": f"{section}区域{label}",
                "x": parent.x,
                "y": parent.y,
                "width": parent.width,
                "height": parent.height,
                "section": section,
                "deviceCodes": [item.code for item in items],
                "children": [local_child(item, slot, parent, existing) for item, slot in zip(items, slots)],
            }
        )
    return sorted(output, key=lambda device: (float(device["y"]), float(device["x"])))


def cluster_boundary(rectangles: Sequence[Rect], padding: float, map_size: tuple[float, float]) -> list[dict[str, float]]:
    x0 = max(min(rect.x for rect in rectangles) - padding, 0)
    y0 = max(min(rect.y for rect in rectangles) - padding, 0)
    x1 = min(max(rect.right for rect in rectangles) + padding, map_size[0])
    y1 = min(max(rect.bottom for rect in rectangles) + padding, map_size[1])
    return [
        {"x": round(x0, 2), "y": round(y0, 2)},
        {"x": round(x1, 2), "y": round(y0, 2)},
        {"x": round(x1, 2), "y": round(y1, 2)},
        {"x": round(x0, 2), "y": round(y1, 2)},
    ]


def rebuild_annotated_sections(
    sections: list[dict[str, object]],
    regions: dict[str, dict[str, Rect]],
    map_size: tuple[float, float],
) -> list[dict[str, object]]:
    annotated_post_x = min(regions["factory1"][label].x for label in "ABCDEFGHIJKLMNOPQRSTUVWXYZ")

    def keep_existing_section(section: dict[str, object]) -> bool:
        if section["id"] in {"vulcanization1", "vulcanization2"}:
            return False
        if section["id"] != "posttreatment1":
            return True
        return max(float(point["x"]) for point in section["points"]) < annotated_post_x

    output = [section for section in sections if keep_existing_section(section)]
    for section in output:
        if section["id"] in SECTION_COLORS:
            section["stroke"] = SECTION_COLORS[section["id"]]
    clusters = {
        "vulcanization1": [
            [regions["factory1"][label] for label in ["⑦", "⑧", "⑨"]],
            [regions["factory1"][label] for label in ["①", "②", "③", "④", "⑤", "⑥"]],
        ],
        "posttreatment1": [
            [regions["factory1"][label] for label in "ABCDEFGH"],
            [regions["factory1"][label] for label in "IJKLMNOPQRSTUVWXYZ"],
        ],
        "vulcanization2": [
            [regions["factory2"][label] for label in ["①", "②"]],
            [regions["factory2"][label] for label in ["③", "④", "⑤"]],
        ],
    }
    for process, process_clusters in clusters.items():
        for rectangles in process_clusters:
            output.append(
                {
                    "id": process,
                    "labelKey": SECTION_LABEL_KEYS[process],
                    "stroke": SECTION_COLORS[process],
                    "points": cluster_boundary(rectangles, 8, map_size),
                }
            )
    return output


def rendered_code_rects(config: dict[str, object]) -> list[tuple[str, str, str | None, Rect]]:
    result: list[tuple[str, str, str | None, Rect]] = []
    for device in config["devices"]:
        parent = Rect(float(device["x"]), float(device["y"]), float(device["width"]), float(device["height"]))
        children = device.get("children", [])
        if children:
            for child in children:
                rect = Rect(
                    parent.x + parent.width * float(child["x"]) / 100,
                    parent.y + parent.height * float(child["y"]) / 100,
                    parent.width * float(child["width"]) / 100,
                    parent.height * float(child["height"]) / 100,
                )
                result.append((str(child["deviceCode"]).upper(), str(child["name"]), device.get("section"), rect))
        elif device.get("deviceCode"):
            result.append((str(device["deviceCode"]).upper(), str(device["name"]), device.get("section"), parent))
    return result


def validate_config(config: dict[str, object], required_codes: set[str]) -> dict[str, object]:
    width = float(config["source"]["imageWidth"])
    height = float(config["source"]["imageHeight"])
    rendered = rendered_code_rects(config)
    duplicate_codes = [code for code, count in _counts(code for code, _, _, _ in rendered).items() if count > 1]
    if duplicate_codes:
        raise ValueError(f"Duplicate rendered device codes: {duplicate_codes}")
    invalid = [
        {"code": code, "rect": rect.__dict__}
        for code, _, _, rect in rendered
        if rect.width <= 0 or rect.height <= 0 or rect.x < -0.1 or rect.y < -0.1 or rect.right > width + 0.1 or rect.bottom > height + 0.1
    ]
    if invalid:
        raise ValueError(f"Invalid device bounds: {invalid[:5]}")

    rendered_codes = {item[0] for item in rendered}
    missing_required_codes = sorted(required_codes - rendered_codes)
    if missing_required_codes:
        raise ValueError(f"Annotated devices missing from generated config: {missing_required_codes}")

    node_ids: list[str] = []
    mismatched_groups: list[str] = []
    for device in config["devices"]:
        node_ids.append(str(device["id"]))
        children = device.get("children", [])
        node_ids.extend(str(child["id"]) for child in children)
        declared_codes = {str(code).upper() for code in device.get("deviceCodes", [])}
        child_codes = {str(child["deviceCode"]).upper() for child in children}
        if (declared_codes or children) and declared_codes != child_codes:
            mismatched_groups.append(str(device["id"]))
    duplicate_ids = [node_id for node_id, count in _counts(node_ids).items() if count > 1]
    if duplicate_ids:
        raise ValueError(f"Duplicate map node ids: {duplicate_ids}")
    if mismatched_groups:
        raise ValueError(f"deviceCodes/children mismatch: {mismatched_groups}")

    return {
        "renderedDeviceCount": len(rendered),
        "uniqueDeviceCodeCount": len(rendered_codes),
        "uniqueNodeIdCount": len(node_ids),
        "annotatedDeviceCount": len(required_codes),
    }


def draw_preview(config: dict[str, object], floorplan_path: Path, output: Path) -> None:
    width = int(config["source"]["imageWidth"])
    height = int(config["source"]["imageHeight"])
    with Image.open(floorplan_path) as source:
        background = source.convert("RGBA").resize((width, height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (width, height), (255, 255, 255, 255))
    canvas.alpha_composite(background)
    overlay = Image.new("RGBA", canvas.size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(overlay)
    colors = {
        "pretreatment1": (245, 182, 56, 68),
        "vulcanization1": (36, 113, 255, 68),
        "posttreatment1": (34, 160, 107, 68),
        "pretreatment2": (245, 182, 56, 68),
        "vulcanization2": (36, 113, 255, 68),
        "posttreatment2": (34, 160, 107, 68),
        None: (120, 130, 145, 55),
    }
    font = ImageFont.load_default()
    for code, _, section, rect in rendered_code_rects(config):
        box = (round(rect.x), round(rect.y), round(rect.right), round(rect.bottom))
        color = colors.get(section, colors[None])
        draw.rectangle(box, fill=color, outline=(*color[:3], 210), width=1)
        if rect.width >= 20 and rect.height >= 11:
            draw.text((box[0] + 2, box[1] + 1), code, fill=(20, 33, 50, 230), font=font)
    for section in config["sections"]:
        points = [(round(point["x"]), round(point["y"])) for point in section["points"]]
        draw.line(points + [points[0]], fill=section["stroke"], width=2)
    canvas.alpha_composite(overlay)
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.resize((width * 2, height * 2), Image.Resampling.NEAREST).save(output, optimize=True)


def main() -> None:
    args = parse_args()
    for source in [args.layout, args.device_master, args.config, args.floorplan_image, args.floorplan_metadata]:
        if not source.exists():
            raise FileNotFoundError(source)

    layout = load_workbook(args.layout)
    metadata = json.loads(args.floorplan_metadata.read_text(encoding="utf-8"))
    with Image.open(args.floorplan_image) as image:
        image.load()
        floorplan = image.convert("RGBA")
    factory1_mapping, factory1_regions = build_factory_mapping(layout, "1工场布局", "factory1", floorplan, metadata)
    factory2_mapping, factory2_regions = build_factory_mapping(layout, "2工场", "factory2", floorplan, metadata)
    mappings = {"factory1": factory1_mapping, "factory2": factory2_mapping}
    regions = {"factory1": factory1_regions, "factory2": factory2_regions}

    with tempfile.TemporaryDirectory(prefix="uni-monitor-map-layout-") as temp_dir_name:
        master_path = convert_master_to_xlsx(args.device_master, args.soffice, Path(temp_dir_name))
        master = load_workbook(master_path)
        by_name, by_code = master_indexes(master)
        records = load_device_records(layout, by_name, args.allow_inferred_codes)

    config = json.loads(args.config.read_text(encoding="utf-8"))
    existing = existing_code_info(config)
    transformed = transform_existing_config(config, mappings)
    mapped_codes = {record.code for record in records}
    retained, removed = remove_mapped_codes(transformed, mapped_codes)
    filled_missing_sections, unresolved_section_conflicts = fill_missing_sections(
        retained,
        by_code,
        float(transformed["source"]["imageHeight"]) / 2,
    )
    generated = generated_layout_devices(records, regions, mappings, existing)
    transformed["devices"] = sorted(retained + generated, key=lambda device: (float(device["y"]), float(device["x"])))
    map_size = (float(transformed["source"]["imageWidth"]), float(transformed["source"]["imageHeight"]))
    transformed["sections"] = rebuild_annotated_sections(transformed["sections"], regions, map_size)
    transformed["source"].update(
        {
            "layoutCoordinateSystem": LAYOUT_COORDINATE_SYSTEM,
            "layoutWorkbook": args.layout.name,
            "deviceMaster": args.device_master.name,
            "annotatedDeviceCount": len(mapped_codes),
        }
    )
    validation = validate_config(transformed, mapped_codes)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(transformed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.preview:
        draw_preview(transformed, args.floorplan_image, args.preview)

    report = {
        "source": {
            "layout": args.layout.name,
            "deviceMaster": args.device_master.name,
            "config": args.config.name,
        },
        "mapSize": {"width": map_size[0], "height": map_size[1]},
        "regions": {
            factory: {label: rect.__dict__ for label, rect in sorted(items.items())}
            for factory, items in regions.items()
        },
        "records": {
            "total": len(records),
            "factory1": sum(record.factory_id == "factory1" for record in records),
            "factory2": sum(record.factory_id == "factory2" for record in records),
            "masterMatched": sum(not record.inferred_code for record in records),
            "inferred": [
                {"code": record.code, "name": record.system_name, "row": record.row}
                for record in records
                if record.inferred_code
            ],
            "previouslyConfigured": len(mapped_codes & set(existing)),
            "newCodes": sorted(mapped_codes - set(existing)),
            "removedFromOldLayout": len(removed),
        },
        "retainedTopLevelNodes": len(retained),
        "retainedPlacementPolicy": "reviewed-map-factory-and-section",
        "filledMissingSections": filled_missing_sections,
        "unresolvedSectionConflicts": unresolved_section_conflicts,
        "inputAlreadyUsesFloorplanCoordinates": config["source"].get("layoutCoordinateSystem") == LAYOUT_COORDINATE_SYSTEM,
        "generatedTopLevelNodes": len(generated),
        "validation": validation,
    }
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
