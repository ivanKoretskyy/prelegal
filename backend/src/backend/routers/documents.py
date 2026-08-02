from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..deps import get_current_user
from ..models import Document, User
from ..schemas import DocumentCreate, DocumentOut, DocumentUpdate
from ..templates import is_known_filename, list_catalog

router = APIRouter(prefix="/api/documents", tags=["documents"])


def _document_name(filename: str) -> str:
    entry = next((entry for entry in list_catalog() if entry.filename == filename), None)
    return entry.name if entry is not None else filename


def _to_out(document: Document) -> DocumentOut:
    return DocumentOut(
        id=document.id,
        filename=document.filename,
        documentName=_document_name(document.filename),
        fields=document.fields,
        createdAt=document.created_at,
        updatedAt=document.updated_at,
    )


def _get_owned_document(session: Session, document_id: int, user: User) -> Document:
    document = session.exec(
        select(Document).where(Document.id == document_id, Document.user_id == user.id)
    ).first()
    if document is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    return document


@router.get("", response_model=list[DocumentOut])
def list_documents(
    user: User = Depends(get_current_user), session: Session = Depends(get_session)
) -> list[DocumentOut]:
    documents = session.exec(
        select(Document).where(Document.user_id == user.id).order_by(Document.updated_at.desc())
    ).all()
    return [_to_out(document) for document in documents]


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
def create_document(
    body: DocumentCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> DocumentOut:
    if not is_known_filename(body.filename):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown document type")

    document = Document(user_id=user.id, filename=body.filename, fields=body.fields)
    session.add(document)
    session.commit()
    session.refresh(document)
    return _to_out(document)


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(
    document_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> DocumentOut:
    return _to_out(_get_owned_document(session, document_id, user))


@router.put("/{document_id}", response_model=DocumentOut)
def update_document(
    document_id: int,
    body: DocumentUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> DocumentOut:
    document = _get_owned_document(session, document_id, user)
    document.fields = body.fields
    document.updated_at = datetime.now(timezone.utc)
    session.add(document)
    session.commit()
    session.refresh(document)
    return _to_out(document)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    document = _get_owned_document(session, document_id, user)
    session.delete(document)
    session.commit()
