from fastapi import APIRouter, HTTPException, status

from ..templates import TemplateDoc, is_known_filename, load_template

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("/{filename}", response_model=TemplateDoc)
def get_template(filename: str) -> TemplateDoc:
    if not is_known_filename(filename):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown document type")

    return load_template(filename)
