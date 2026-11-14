#!/usr/bin/env python3
"""Turns the full-size art in assets-src into the game-ready images in public/assets.

Corals: the game never draws a coral larger than 200x170 px (CoralManager.js), or 260x220 in the tutorial, and it
makes ten bleached copies of every image in memory. Shipping the art at its original 350-900 px meant 12 times more
texture memory than was ever shown. Each image is shrunk to fit CORAL_MAX: 1.5x the in-game size, which covers the
tutorial's coral, the hover pulse and the 1.35x camera zoom on the nest.

Stress outline: the red frame that fades in around the screen is a soft blur with no detail, so it's stored at a
quarter of its size and stretched back up by the game (TestScene.js, setupUI).

Needs Pillow (pip install pillow). Run from the repo root after adding or changing art:
    python3 scripts/build-art.py
"""
from pathlib import Path
from PIL import Image

SRC = Path("assets-src")
OUT = Path("public/assets")
CORAL_MAX = (300, 255)
OUTLINE_SHRINK = 4


def shrink(path, out, scale):
    image = Image.open(path).convert("RGBA")
    size = (round(image.width * scale), round(image.height * scale))
    # Resized with the colour multiplied by the alpha, so see-through edge pixels don't bleed a dark fringe into the art
    small = image.convert("RGBa").resize(size, Image.LANCZOS).convert("RGBA")
    small.save(out, optimize=True)
    print(f"{path.name}: {image.width}x{image.height} -> {size[0]}x{size[1]}")


for path in sorted((SRC / "corals").glob("*.png")):
    with Image.open(path) as image:
        scale = min(CORAL_MAX[0] / image.width, CORAL_MAX[1] / image.height, 1)
    shrink(path, OUT / "corals" / path.name, scale)

outline = SRC / "background" / "endangeredCoralOutline.png"
shrink(outline, OUT / "background" / outline.name, 1 / OUTLINE_SHRINK)
