"""
Generates a printable A4 sheet of student ID cards: QR code, name, reg
number, department/level, and the raw token in small monospace as a
manual-read fallback (spec section 03).

Card layout: 2 columns x 4 rows = 8 cards per sheet, with cut guides.
"""
import io
import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib import colors

PAGE_W, PAGE_H = A4
CARD_W, CARD_H = 85 * mm, 54 * mm  # standard ID-card-ish proportions
COLS, ROWS = 2, 4
MARGIN_X = (PAGE_W - COLS * CARD_W) / (COLS + 1)
MARGIN_Y = (PAGE_H - ROWS * CARD_H) / (ROWS + 1)


def _qr_image(data):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=6, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def _draw_card(c, x, y, student, raw_token):
    # Cut-guide border
    c.setStrokeColor(colors.HexColor("#CBD5E1"))
    c.setDash(2, 2)
    c.rect(x, y, CARD_W, CARD_H)
    c.setDash()

    pad = 4 * mm
    qr_size = 30 * mm
    c.drawImage(_qr_image(raw_token), x + pad, y + CARD_H - qr_size - pad, qr_size, qr_size, mask="auto")

    text_x = x + pad + qr_size + 4 * mm
    text_y = y + CARD_H - pad - 4 * mm

    c.setFont("Helvetica-Bold", 10)
    c.drawString(text_x, text_y, student.full_name[:26])

    c.setFont("Helvetica", 8)
    c.drawString(text_x, text_y - 12, student.reg_no)
    c.drawString(text_x, text_y - 24, f"{student.department.code} · {student.level.name}L")

    c.setFont("Helvetica", 6)
    c.drawString(x + pad, y + pad, "SWEP/SWIES ATTENDANCE CARD")

    # Human-readable fallback token, small monospace, under the QR
    c.setFont("Courier", 6)
    c.drawString(x + pad, y + CARD_H - qr_size - pad - 8, raw_token)


def generate_card_sheet(cards_with_tokens):
    """
    cards_with_tokens: list of (student, raw_token) tuples.
    Returns a BytesIO PDF, paginating 8 cards per sheet.
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)

    for i, (student, raw_token) in enumerate(cards_with_tokens):
        pos_in_page = i % (COLS * ROWS)
        if i > 0 and pos_in_page == 0:
            c.showPage()
        col = pos_in_page % COLS
        row = pos_in_page // COLS
        x = MARGIN_X + col * (CARD_W + MARGIN_X)
        y = PAGE_H - MARGIN_Y - (row + 1) * CARD_H - row * MARGIN_Y
        _draw_card(c, x, y, student, raw_token)

    c.save()
    buffer.seek(0)
    return buffer
