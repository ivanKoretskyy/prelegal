from fastapi import APIRouter, HTTPException, status

from ..templates import TemplateDoc, list_catalog, load_template

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("/{filename}", response_model=TemplateDoc)
def get_template(filename: str) -> TemplateDoc:
    valid_filenames = {entry.filename for entry in list_catalog()}
    if filename not in valid_filenames:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown document type")

    return load_template(filename)
