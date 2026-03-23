#!/usr/bin/env python3
"""Write minimal solid-color PNGs for Chrome Web Store (stdlib only)."""
from __future__ import annotations

import struct
import zlib
from pathlib import Path


def write_png(path: Path, width: int, height: int, rgb: tuple[int, int, int]) -> None:
    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    r, g, b = rgb
    pixel = bytes((r, g, b))
    raw = b"".join(b"\x00" + pixel * width for _ in range(height))
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def main() -> None:
    root = Path(__file__).resolve().parent.parent / "extension" / "icons"
    root.mkdir(parents=True, exist_ok=True)
    # BRYSK-adjacent accent; replace with branded artwork for production if desired
    color = (0x5B, 0x61, 0xFF)
    for size in (16, 48, 128):
        write_png(root / f"icon{size}.png", size, size, color)
    print("Wrote", root / "icon{16,48,128}.png")


if __name__ == "__main__":
    main()
