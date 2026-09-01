#!/usr/bin/env python3
"""Generate the css-map floor-plan texture from the two factory PDF drawings."""

from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image


MAP_WIDTH = 2060
MAP_HEIGHT = 1280
OUTPUT_SCALE = 2
CANVAS_SIZE = (MAP_WIDTH * OUTPUT_SCALE, MAP_HEIGHT * OUTPUT_SCALE)
INK_THRESHOLD = 247


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--factory-one", required=True, type=Path)
    parser.add_argument("--factory-two", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--metadata", type=Path)
    parser.add_argument("--dpi", type=int, default=300)
    return parser.parse_args()


def render_pdf(pdf_path: Path, output_prefix: Path, dpi: int) -> Path:
    subprocess.run(
        ["pdftoppm", "-f", "1", "-singlefile", "-png", "-r", str(dpi), str(pdf_path), str(output_prefix)],
        check=True,
    )
    return output_prefix.with_suffix(".png")


def find_content_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    gray = image.convert("L")
    mask = gray.point(lambda value: 255 if value < INK_THRESHOLD else 0)
    bbox = mask.getbbox()
    if bbox is None:
        raise ValueError("PDF rendered without visible content")

    margin = max(round(min(image.size) * 0.008), 8)
    left, top, right, bottom = bbox
    return (
        max(left - margin, 0),
        max(top - margin, 0),
        min(right + margin, image.width),
        min(bottom + margin, image.height),
    )


def create_transparent_linework(image: Image.Image) -> Image.Image:
    gray = image.convert("L")
    alpha = gray.point(
        lambda value: 0 if value >= 252 else min(round((252 - value) * 3.2), 230),
    )
    linework = Image.new("RGBA", image.size, (45, 65, 82, 0))
    linework.putalpha(alpha)
    return linework


def fit_into_band(
    image: Image.Image,
    band: tuple[int, int, int, int],
) -> tuple[Image.Image, tuple[int, int], float]:
    left, top, right, bottom = band
    available_width = right - left
    available_height = bottom - top
    scale = min(available_width / image.width, available_height / image.height)
    resized_size = (
        max(round(image.width * scale), 1),
        max(round(image.height * scale), 1),
    )
    resized = image.resize(resized_size, Image.Resampling.LANCZOS)
    position = (
        left + (available_width - resized.width) // 2,
        top + (available_height - resized.height) // 2,
    )
    return resized, position, scale


def process_factory(
    rendered_path: Path,
    band: tuple[int, int, int, int],
) -> tuple[Image.Image, tuple[int, int], dict[str, object]]:
    with Image.open(rendered_path) as source:
        source.load()
        source_size = source.size
        crop_bbox = find_content_bbox(source)
        cropped = source.crop(crop_bbox)
        rotated = cropped.transpose(Image.Transpose.ROTATE_90)
        linework = create_transparent_linework(rotated)
        fitted, position, scale = fit_into_band(linework, band)

    metadata = {
        "renderedPixelSize": {"width": source_size[0], "height": source_size[1]},
        "crop": {
            "left": crop_bbox[0],
            "top": crop_bbox[1],
            "right": crop_bbox[2],
            "bottom": crop_bbox[3],
        },
        "rotation": "counter-clockwise-90",
        "placementPixel": {
            "x": position[0],
            "y": position[1],
            "width": fitted.width,
            "height": fitted.height,
        },
        "placementMap": {
            "x": position[0] / OUTPUT_SCALE,
            "y": position[1] / OUTPUT_SCALE,
            "width": fitted.width / OUTPUT_SCALE,
            "height": fitted.height / OUTPUT_SCALE,
        },
        "scaleAfterRotation": scale,
    }
    return fitted, position, metadata


def main() -> None:
    args = parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.metadata:
        args.metadata.parent.mkdir(parents=True, exist_ok=True)

    band_padding_x = 90 * OUTPUT_SCALE
    band_padding_y = 38 * OUTPUT_SCALE
    half_height = CANVAS_SIZE[1] // 2
    bands = [
        (band_padding_x, band_padding_y, CANVAS_SIZE[0] - band_padding_x, half_height - band_padding_y),
        (
            band_padding_x,
            half_height + band_padding_y,
            CANVAS_SIZE[0] - band_padding_x,
            CANVAS_SIZE[1] - band_padding_y,
        ),
    ]

    with tempfile.TemporaryDirectory(prefix="uni-monitor-floorplan-") as temp_dir:
        temp_path = Path(temp_dir)
        rendered = [
            render_pdf(args.factory_one, temp_path / "factory-one", args.dpi),
            render_pdf(args.factory_two, temp_path / "factory-two", args.dpi),
        ]
        processed = [
            process_factory(rendered[0], bands[0]),
            process_factory(rendered[1], bands[1]),
        ]

    canvas = Image.new("RGBA", CANVAS_SIZE, (255, 255, 255, 0))
    metadata: dict[str, object] = {
        "mapSize": {"width": MAP_WIDTH, "height": MAP_HEIGHT},
        "outputPixelSize": {"width": CANVAS_SIZE[0], "height": CANVAS_SIZE[1]},
        "outputScale": OUTPUT_SCALE,
        "factories": [],
    }
    for factory_id, source_pdf, (image, position, item_metadata) in zip(
        ["factory1", "factory2"],
        [args.factory_one, args.factory_two],
        processed,
    ):
        canvas.alpha_composite(image, position)
        metadata["factories"].append(
            {"id": factory_id, "sourcePdf": source_pdf.name, **item_metadata},
        )

    canvas.save(args.output, optimize=True)
    if args.metadata:
        args.metadata.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
