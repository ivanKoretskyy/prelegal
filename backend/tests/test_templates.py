import pytest

from backend.templates import extract_field_labels, list_catalog, load_template


def test_list_catalog_returns_all_eleven_documents():
    catalog = list_catalog()

    assert len(catalog) == 11
    assert {entry.filename for entry in catalog} >= {"Mutual-NDA.md", "CSA.md", "BAA.md"}


def test_extract_field_labels_dedupes_and_preserves_first_seen_order():
    content = (
        '<span class="coverpage_link">Purpose</span> ... '
        '<span class="coverpage_link">Effective Date</span> ... '
        '<span class="coverpage_link">Purpose</span>'
    )

    assert extract_field_labels(content) == ["Purpose", "Effective Date"]


def test_extract_field_labels_matches_every_link_class_variant():
    content = (
        '<span class="coverpage_link">A</span>'
        '<span class="keyterms_link">B</span>'
        '<span class="orderform_link">C</span>'
        '<span class="sow_link">D</span>'
        '<span class="businessterms_link">E</span>'
    )

    assert extract_field_labels(content) == ["A", "B", "C", "D", "E"]


def test_extract_field_labels_ignores_header_spans_and_bare_anchor_spans():
    content = (
        '<span class="header_2" id="1">Service</span> '
        '<span id="4.1"></span> '
        '<span class="coverpage_link" id="7.1">Governing Law</span>'
    )

    assert extract_field_labels(content) == ["Governing Law"]


def test_load_template_returns_real_content_and_fields_for_mutual_nda():
    doc = load_template("Mutual-NDA.md")

    assert doc.name == "Mutual Non-Disclosure Agreement"
    assert "Purpose" in doc.fields
    assert "# Standard Terms" in doc.content


def test_load_template_raises_for_unknown_filename():
    with pytest.raises(FileNotFoundError):
        load_template("Nonexistent.md")


def test_every_catalog_document_has_at_least_one_field():
    for entry in list_catalog():
        doc = load_template(entry.filename)
        assert len(doc.fields) > 0, f"{entry.filename} parsed with no fields"
