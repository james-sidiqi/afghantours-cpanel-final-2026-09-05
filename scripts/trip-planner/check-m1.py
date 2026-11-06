#!/usr/bin/env python3
"""M1 privacy and route guard. Run AFTER npm run build. Uses stdlib only.

This marker scan is a defense against accidentally shipping private rate tables,
NOT proof that all possible customer/private data is absent. M2/M3 require
runtime authorization tests and a private-source fingerprint comparison.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

TEXT_EXT = {".html", ".htm", ".js", ".mjs", ".css", ".json", ".csv",
            ".xml", ".txt", ".php", ".md", ".yml", ".yaml"}
FORBIDDEN_MARKERS = (
    b"private_archive_do_not_web_upload",
    b"phase1_afn_cost_register",
    b"user_supplied_afn_supplier_register",
    b"original_master_rate_register",
    b"historical_hotel_ranges_14",
    b"attraction_fee_references_65",
    b"repo_room_cost_sell_comparison",
    b"operator_costs_and_policy.json",
    b"source_workbooks/",
    b"low_afn,medium_afn,high_afn",
)
FORBIDDEN_PATTERNS = (
    re.compile(rb"\bPDF-\d{3}\b", re.I),
    re.compile(rb'["\x27]?(?:low_afn|medium_afn|high_afn)["\x27]?\s*:', re.I),
)
PUBLIC_FORBIDDEN_KEYS = {
    "supplier", "supplier_name", "supplier_id", "staff_rate", "cost_lines",
    "internal_cost", "internal_cost_usd", "target_gross_margin", "markup",
    "margin", "payment_fee", "profit", "profit_margin", "private_notes",
}

def fail(messages: list[str], message: str) -> None:
    messages.append(message)

def inspect_public_tree(root: Path, messages: list[str]) -> tuple[int, int]:
    examined = 0
    for base in (root / "public", root / "dist"):
        if not base.exists():
            fail(messages, f"missing public root: {base} (build first)")
            continue
        if (base / "private-calculator").exists():
            fail(messages, f"private calculator must not be in static web tree: {base}")
        if (base / "trip-planner-intake").exists():
            fail(messages, f"PHP intake adapter must not be in static web tree: {base}")
        for path in base.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(root)
            name = str(rel).lower().encode("utf-8")
            if any(marker in name for marker in FORBIDDEN_MARKERS):
                fail(messages, f"private archive name leaked into public path: {rel}")
            if path.suffix.lower() not in TEXT_EXT:
                continue
            examined += 1
            payload = path.read_bytes().lower()
            if any(marker in payload for marker in FORBIDDEN_MARKERS) or any(p.search(payload) for p in FORBIDDEN_PATTERNS):
                fail(messages, f"private rate/source marker found in public build: {rel}")
    return examined, len(messages)

def inspect_contracts(root: Path, messages: list[str]) -> None:
    base = root / "trip-planner" / "contracts"
    public = json.loads((base / "public-request.v1.schema.json").read_text(encoding="utf-8"))
    staff = json.loads((base / "staff-proposal.v1.schema.json").read_text(encoding="utf-8"))
    example = json.loads((base / "example-public-request.v1.json").read_text(encoding="utf-8"))
    for label, schema in (("public", public), ("staff", staff)):
        if schema.get("properties", {}).get("schema_version", {}).get("const") != "1.0.0":
            fail(messages, f"{label} version is not 1.0.0")
        if schema.get("additionalProperties") is not False:
            fail(messages, f"{label} contract lacks root additionalProperties false")
    def all_object_nodes(obj, path="$"):
        if isinstance(obj, dict):
            if obj.get("type") == "object" and obj.get("additionalProperties") is not False:
                fail(messages, f"unbounded object in public schema at {path}")
            for key, value in obj.items():
                all_object_nodes(value, path + "/" + key)
        elif isinstance(obj, list):
            for idx, value in enumerate(obj):
                all_object_nodes(value, path + "/" + str(idx))
    all_object_nodes(public)
    prop_names = set()
    def gather_schema_props(x):
        if isinstance(x, dict):
            if "properties" in x:
                prop_names.update(x["properties"])
            for v in x.values():
                gather_schema_props(v)
        elif isinstance(x, list):
            for v in x:
                gather_schema_props(v)
    gather_schema_props(public)
    bad = sorted(prop_names & PUBLIC_FORBIDDEN_KEYS)
    if bad:
        fail(messages, "internal pricing keys in public schema: " + ", ".join(bad))
    if example.get("schema_version") != "1.0.0":
        fail(messages, "fixture schema version mismatched")
    if not set(public.get("required", [])).issubset(example):
        fail(messages, "fixture missing required public fields")
    if set(example) - set(public.get("properties", {})):
        fail(messages, "fixture has fields outside public contract")
    if any(k.lower() in str(example).lower() for k in (
        "supplier", "profit", "gross_margin", "internal_cost", "cost_lines")):
        fail(messages, "fixture contains an internal pricing marker")

def inspect_routes(root: Path, messages: list[str], expected: int) -> int:
    sitemap = root / "dist" / "sitemap.xml"
    if not sitemap.is_file():
        fail(messages, "dist/sitemap.xml missing; run npm run build")
        return -1
    try:
        xml_root = ET.parse(sitemap).getroot()
        count = sum(1 for e in xml_root if e.tag.rsplit("}", 1)[-1] == "url")
    except ET.ParseError as error:
        fail(messages, f"sitemap invalid XML: {error}")
        return -1
    if count != expected:
        fail(messages, f"route count changed: expected {expected}, observed {count}")
    text = sitemap.read_text(encoding="utf-8")
    for forbidden_route in ("/private-calculator/", "/trip-planner-intake/"):
        if forbidden_route in text:
            fail(messages, f"internal endpoint appeared in sitemap: {forbidden_route}")
    return count

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--expected-routes", type=int, default=298)
    args = parser.parse_args()
    failures: list[str] = []
    try:
        inspect_contracts(args.root, failures)
        count = inspect_routes(args.root, failures, args.expected_routes)
        public_files, _ = inspect_public_tree(args.root, failures)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        fail(failures, f"integrity scanner could not complete: {error}")
        count = -1
        public_files = 0
    if failures:
        for item in failures:
            print("FAIL:", item, file=sys.stderr)
        print(f"M1 FAIL | sitemap URLs: {count} | public text files scanned: {public_files}")
        return 1
    print(f"M1 PASS | sitemap URLs: {count} | public text files scanned: {public_files} | no private rate markers")
    print("Note: marker scan does not replace full source/rate hash comparison or server access-control tests.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
