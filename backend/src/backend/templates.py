import json
import os
import re
from pathlib import Path

from pydantic import BaseModel

TEMPLATES_DIR = Path(
    os.environ.get("TEMPLATES_DIR", Path(__file__).resolve().parents[3] / "templates")
)
CATALOG_PATH = Path(
    os.environ.get("CATALOG_PATH", Path(__file__).resolve().parents[3] / "catalog.json")
)

_FIELD_PATTERN = re.compile(r'class="[a-z]+_link"[^>]*>([^<]+)</span>')


class CatalogEntry(BaseModel):
    name: str
    description: str
    filename: str


class TemplateDoc(BaseModel):
    name: str
    filename: str
    fields: list[str]
    content: str


def list_catalog() -> list[CatalogEntry]:
    data = json.loads(CATALOG_PATH.read_text())
    return [CatalogEntry(**entry) for entry in data]


def extract_field_labels(content: str) -> list[str]:
    seen: dict[str, None] = {}
    for match in _FIELD_PATTERN.finditer(content):
        seen.setdefault(match.group(1).strip(), None)
    return list(seen)


def load_template(filename: str) -> TemplateDoc:
    catalog_entry = next((entry for entry in list_catalog() if entry.filename == filename), None)
    if catalog_entry is None:
        raise FileNotFoundError(filename)

    content = (TEMPLATES_DIR / filename).read_text()
    return TemplateDoc(
        name=catalog_entry.name,
        filename=filename,
        fields=extract_field_labels(content),
        content=content,
    )
