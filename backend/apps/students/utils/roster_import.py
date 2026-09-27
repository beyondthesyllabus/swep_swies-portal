"""
Parses an official class list into roster rows.

Supported inputs:
  * .pdf  — text-based PDFs (tables first, regex-line fallback second).
            Many real class lists are SCANNED IMAGES with no text layer;
            pdfplumber cannot read those, so we fall back to OCR
            (pypdfium2 renders each page -> RapidOCR reads the words) and
            reconstruct the table rows from the word bounding boxes.
  * .csv  — plain "reg_no, name" (an optional S/N column and a header row
            are tolerated).

Reg-number formats recognised (add your institution's here if different):
  * 22/EG/FE/630        <- YY/<faculty>/<dept>/<serial>   (this institution)
  * ENG/2021/001        <- <dept>/<year>/<serial>
  * 2021001234          <- bare 8-12 digit matric numbers
"""
import csv
import io
import os
import re
import tempfile

import pdfplumber

# Longest / most specific alternative first so the 4-segment form wins.
REG_NUMBER_PATTERN = re.compile(
    r"(\d{2,4}/[A-Z]{2,10}/[A-Z]{2,10}/\d{3,6}"   # 22/EG/FE/630
    r"|[A-Z]{2,10}/\d{2,4}/\d{3,6}"               # ENG/2021/001
    r"|\d{8,12})",                                # 2021001234
    re.IGNORECASE,
)

# Cells that are never a name: empty, pure S/N numbers like "12" or "12."
_SN_CELL = re.compile(r"^\d{1,4}\.?$")


def _split_name(full_name):
    parts = full_name.split()
    if not parts:
        return "", "", ""
    if len(parts) == 1:
        return parts[0], "", ""
    if len(parts) == 2:
        return parts[0], parts[1], ""
    # Assume "First Middle... Surname" — last token is surname.
    return parts[0], parts[-1], " ".join(parts[1:-1])


def _read_bytes(file_obj):
    """Return the file contents as bytes, regardless of pointer position."""
    if isinstance(file_obj, (bytes, bytearray)):
        return bytes(file_obj)
    try:
        file_obj.seek(0)
    except Exception:
        pass
    data = file_obj.read()
    return data.encode("utf-8") if isinstance(data, str) else bytes(data)


# ---------------------------------------------------------------------------
# PDF — text layer
# ---------------------------------------------------------------------------

def _extract_pdf_rows(file_obj):
    """Returns (rows, saw_any_text). rows = [(reg_no, name), ...]."""
    rows = []
    saw_any_text = False

    with pdfplumber.open(io.BytesIO(_read_bytes(file_obj))) as pdf:
        for page in pdf.pages:
            if page.chars:
                saw_any_text = True
            for table in page.extract_tables():
                for row in table:
                    if not row or len(row) < 2:
                        continue
                    reg_candidate, name_candidate = row[0], row[1]
                    if reg_candidate and REG_NUMBER_PATTERN.search(str(reg_candidate)):
                        rows.append((str(reg_candidate).strip(), str(name_candidate or "").strip()))

        if not rows:
            for page in pdf.pages:
                text = page.extract_text() or ""
                for line in text.split("\n"):
                    match = REG_NUMBER_PATTERN.search(line)
                    if not match:
                        continue
                    reg_no = match.group(1).strip()
                    name = line.replace(match.group(0), "").strip(" -.:\t")
                    rows.append((reg_no, name))  # name may legitimately be blank

    return rows, saw_any_text


# ---------------------------------------------------------------------------
# PDF — OCR fallback for scanned (image-only) documents
# ---------------------------------------------------------------------------

def _ocr_available():
    try:
        import pypdfium2  # noqa: F401
        from rapidocr_onnxruntime import RapidOCR  # noqa: F401
        return True
    except Exception:
        return False


def _cluster_rows(boxes, tol_ratio=0.6):
    """Group OCR word boxes into visual table rows by their vertical centre.

    boxes: list of dicts {text, x0, y0, x1, y1}. Returns list of rows, each a
    list of boxes sorted left-to-right.
    """
    if not boxes:
        return []
    heights = sorted((b["y1"] - b["y0"]) for b in boxes)
    median_h = heights[len(heights) // 2] or 12.0
    tol = max(6.0, median_h * tol_ratio)

    ordered = sorted(boxes, key=lambda b: (b["y0"] + b["y1"]) / 2.0)
    rows = []
    current = [ordered[0]]
    current_center = (ordered[0]["y0"] + ordered[0]["y1"]) / 2.0
    for b in ordered[1:]:
        center = (b["y0"] + b["y1"]) / 2.0
        if abs(center - current_center) <= tol:
            current.append(b)
            # running average keeps long rows from drifting apart
            current_center = sum((x["y0"] + x["y1"]) / 2.0 for x in current) / len(current)
        else:
            rows.append(sorted(current, key=lambda x: x["x0"]))
            current = [b]
            current_center = center
    rows.append(sorted(current, key=lambda x: x["x0"]))
    return rows


def _row_to_pair(row_boxes):
    """Turn one visual row of OCR boxes into (reg_no, name) or None."""
    cells = [b["text"].strip() for b in row_boxes if b["text"].strip()]
    if not cells:
        return None
    joined = " ".join(cells)
    match = REG_NUMBER_PATTERN.search(joined)
    if not match:
        return None
    reg_no = match.group(1).strip()

    # Name = the alphabetic cells that are not the reg-number and not an S/N.
    reg_norm = reg_no.replace(" ", "").lower()
    name_parts = []
    for cell in cells:
        c = cell.strip()
        if not c or _SN_CELL.match(c):
            continue
        if c.replace(" ", "").lower() == reg_norm:
            continue
        # Skip cells that are (part of) the reg number itself.
        if REG_NUMBER_PATTERN.fullmatch(c):
            continue
        if c in reg_no or reg_no in c:
            continue
        name_parts.append(c)
    name = " ".join(name_parts).strip(" -.:\t")
    return reg_no, name


def _ocr_pdf_rows(data):
    """Render each PDF page and OCR it. Returns [(reg_no, name), ...]."""
    import pypdfium2 as pdfium
    from rapidocr_onnxruntime import RapidOCR

    ocr = RapidOCR()
    rows = []
    pdf = pdfium.PdfDocument(data)
    try:
        for page in pdf:
            # scale=3 -> ~216 DPI, a good balance of accuracy vs. speed.
            bitmap = page.render(scale=3)
            pil_image = bitmap.to_pil()
            tmp_path = None
            try:
                fd, tmp_path = tempfile.mkstemp(suffix=".png")
                os.close(fd)
                pil_image.save(tmp_path)
                result, _elapse = ocr(tmp_path)
            finally:
                if tmp_path and os.path.exists(tmp_path):
                    try:
                        os.remove(tmp_path)
                    except OSError:
                        pass
            if not result:
                continue
            boxes = []
            for quad, text, _conf in result:
                xs = [p[0] for p in quad]
                ys = [p[1] for p in quad]
                boxes.append({
                    "text": text,
                    "x0": min(xs), "x1": max(xs),
                    "y0": min(ys), "y1": max(ys),
                })
            for row_boxes in _cluster_rows(boxes):
                pair = _row_to_pair(row_boxes)
                if pair:
                    rows.append(pair)
    finally:
        pdf.close()

    # De-duplicate while preserving order (a reg number should appear once).
    seen = set()
    unique = []
    for reg_no, name in rows:
        key = reg_no.lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append((reg_no, name))
    return unique


def _pdf_no_rows_error(saw_any_text, ocr_tried):
    if not saw_any_text and not ocr_tried:
        return ValueError(
            "This PDF is a scanned image with no selectable text. OCR support is "
            "not installed on the server, so registration numbers cannot be read "
            "automatically. Export a CSV of the class list (reg. number + name) "
            "and upload that instead."
        )
    if not saw_any_text and ocr_tried:
        return ValueError(
            "This PDF is a scanned image and OCR could not confidently read any "
            "registration numbers from it. Try a higher-quality scan, or export a "
            "CSV of the class list (reg. number + name) and upload that instead."
        )
    return ValueError(
        "No reg. number / name pairs found. Check REG_NUMBER_PATTERN in "
        "apps/students/utils/roster_import.py matches your institution's format."
    )


def _extract_rows_with_ocr(file_obj):
    """Text layer first; OCR fallback for scanned pages.

    Returns (rows, saw_any_text, ocr_tried).
    """
    data = _read_bytes(file_obj)
    rows, saw_any_text = _extract_pdf_rows(io.BytesIO(data))
    ocr_tried = False
    if not rows and not saw_any_text and _ocr_available():
        ocr_tried = True
        try:
            rows = _ocr_pdf_rows(data)
        except Exception:
            rows = []
    return rows, saw_any_text, ocr_tried


def parse_roster_pdf(file_obj):
    """Returns [{"reg_no", "first_name", "surname", "other_names"}, ...]."""
    rows, saw_any_text, ocr_tried = _extract_rows_with_ocr(file_obj)
    if not rows:
        raise _pdf_no_rows_error(saw_any_text, ocr_tried)

    results = []
    for reg_no, full_name in rows:
        first_name, surname, other_names = _split_name(full_name)
        results.append({
            "reg_no": reg_no, "first_name": first_name, "surname": surname, "other_names": other_names,
        })
    return results


def parse_roster_reference_pdf(file_obj):
    """Returns [{"reg_no", "name"}, ...] for RosterReference (name may be blank)."""
    rows, saw_any_text, ocr_tried = _extract_rows_with_ocr(file_obj)
    if not rows:
        raise _pdf_no_rows_error(saw_any_text, ocr_tried)
    return [{"reg_no": reg_no, "name": name} for reg_no, name in rows]


# ---------------------------------------------------------------------------
# CSV
# ---------------------------------------------------------------------------

def _read_csv_rows(file_obj):
    """Yield (reg_no, name) from a CSV, tolerating S/N columns and a header."""
    raw = _read_bytes(file_obj)
    text = raw.decode("utf-8-sig") if isinstance(raw, bytes) else raw
    reader = csv.reader(io.StringIO(text))
    pairs = []
    for row in reader:
        cells = [c.strip() for c in row if c is not None]
        if not cells:
            continue
        reg_no = None
        for cell in cells:
            if REG_NUMBER_PATTERN.fullmatch(cell) or REG_NUMBER_PATTERN.search(cell):
                reg_no = cell
                break
        if not reg_no:
            continue  # header row or junk
        name_cells = [c for c in cells if c != reg_no and not _SN_CELL.match(c)]
        # Prefer the longest remaining cell as the name (skips stray columns).
        name = max(name_cells, key=len) if name_cells else ""
        pairs.append((reg_no, name))
    return pairs


def parse_roster_csv(file_obj):
    """Returns [{"reg_no", "first_name", "surname", "other_names"}, ...]."""
    pairs = _read_csv_rows(file_obj)
    if not pairs:
        raise ValueError("No reg. number / name pairs found in this CSV.")
    results = []
    for reg_no, full_name in pairs:
        first_name, surname, other_names = _split_name(full_name)
        results.append({
            "reg_no": reg_no, "first_name": first_name, "surname": surname, "other_names": other_names,
        })
    return results


def parse_roster_reference_csv(file_obj):
    """Returns [{"reg_no", "name"}, ...] for RosterReference."""
    pairs = _read_csv_rows(file_obj)
    if not pairs:
        raise ValueError("No reg. numbers could be found in this CSV.")
    return [{"reg_no": reg_no, "name": name} for reg_no, name in pairs]


# ---------------------------------------------------------------------------
# Dispatch by file type
# ---------------------------------------------------------------------------

def _is_csv(file_obj):
    name = getattr(file_obj, "name", "") or ""
    return name.lower().endswith(".csv")


def parse_roster_reference(file_obj):
    """Phase 1 official class list -> [{"reg_no", "name"}, ...]."""
    return parse_roster_reference_csv(file_obj) if _is_csv(file_obj) else parse_roster_reference_pdf(file_obj)


def parse_roster(file_obj):
    """Bulk student import -> [{"reg_no", "first_name", "surname", "other_names"}, ...]."""
    return parse_roster_csv(file_obj) if _is_csv(file_obj) else parse_roster_pdf(file_obj)
