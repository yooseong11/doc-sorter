#!/usr/bin/env python3
"""OCR 경로(R4) 확인용 이미지 샘플 생성 스크립트.

텍스트 레이어가 없는 PNG와 이미지 PDF를 만든다. 내용은 전부 가상이다.
실행: ../../../backend/.venv/bin/python make_image_samples.py
의존: Pillow (backend/.venv에 설치되어 있음)
한글 폰트: /System/Library/Fonts/Supplemental/Arial Unicode.ttf (macOS 기본)
"""
import os
import random
import shutil

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.dirname(os.path.abspath(__file__))
DOCUMENTS = os.path.join(OUT, '..', 'documents')
FONT_PATH = '/System/Library/Fonts/Supplemental/Arial Unicode.ttf'

# A4 비율, 150dpi 스캔 수준
PAGE = (1240, 1754)
INK = (35, 35, 40)
PAPER = (246, 243, 236)


def font(size):
    return ImageFont.truetype(FONT_PATH, size)


def scanned(page, angle, seed):
    """종이색·잡음·약한 기울기·흐림을 넣어 스캔본처럼 만든다."""
    rng = random.Random(seed)
    noise = Image.effect_noise(page.size, 18).convert('RGB')
    page = Image.blend(page, noise, 0.06)
    page = page.rotate(angle, resample=Image.BICUBIC, expand=False, fillcolor=PAPER)
    page = page.filter(ImageFilter.GaussianBlur(0.6))
    # 스캐너 가장자리 그림자
    draw = ImageDraw.Draw(page)
    for i in range(rng.randint(10, 18)):
        shade = 200 + i * 3
        draw.line([(i, 0), (i, page.height)], fill=(shade, shade, shade))
    return page


def table(draw, top, rows, col_x, row_h, size=30):
    left, right = col_x[0] - 20, PAGE[0] - 100
    for i, row in enumerate(rows):
        y = top + i * row_h
        draw.line([(left, y), (right, y)], fill=INK, width=2)
        for x, cell in zip(col_x, row):
            draw.text((x, y + (row_h - size) // 2), cell, font=font(size), fill=INK)
    bottom = top + len(rows) * row_h
    draw.line([(left, bottom), (right, bottom)], fill=INK, width=2)
    for x in [left, *[c - 20 for c in col_x[1:]], right]:
        draw.line([(x, top), (x, bottom)], fill=INK, width=2)
    return bottom


def make_leave_request_png():
    """근태: 스캔한 연차휴가 신청서. 파일명은 스캐너 기본 이름이라 힌트가 없다."""
    page = Image.new('RGB', PAGE, PAPER)
    d = ImageDraw.Draw(page)
    d.text((PAGE[0] // 2, 150), '연차 휴가 신청서', font=font(64), fill=INK, anchor='mm')
    bottom = table(d, 260, [
        ('소속', '경영지원팀'),
        ('성명', '김하늘'),
        ('직급', '대리'),
        ('휴가 종류', '연차 (유급)'),
        ('기간', '2026년 12월 22일 ~ 12월 24일 (3일)'),
        ('사유', '개인 사정 (가족 여행)'),
        ('비상 연락처', '010-0000-1234'),
        ('업무 대행자', '박서준 주임'),
    ], col_x=[140, 440], row_h=90)
    d.text((140, bottom + 80), '위와 같이 연차 휴가를 신청하오니 승인하여 주시기 바랍니다.', font=font(30), fill=INK)
    d.text((PAGE[0] - 140, bottom + 200), '2026년 12월 1일', font=font(30), fill=INK, anchor='ra')
    d.text((PAGE[0] - 140, bottom + 260), '신청인  김하늘  (인)', font=font(30), fill=INK, anchor='ra')
    # 결재란
    table(d, bottom + 380, [('담당', '팀장', '본부장'), ('김하늘', '이도윤', '')],
          col_x=[560, 760, 960], row_h=80, size=28)
    page = scanned(page, angle=1.2, seed=1)
    path = os.path.join(OUT, 'SCAN_20261201_0915.png')
    # 잡음 때문에 컬러 PNG가 2MB를 넘으므로 회색조로 저장해 배포 크기를 줄인다.
    page.convert('L').quantize(32).save(path, optimize=True)
    return path


def make_receipt_image_pdf():
    """비용 증빙: 휴대폰으로 찍은 법인카드 영수증 2장을 이미지 PDF로 합친 파일. 텍스트 레이어 없음."""
    pages = []
    receipts = [
        ('오피스마트 강남점', '2026-11-18 14:22', [
            ('A4 복사용지 (박스)', '2', '27,000'),
            ('토너 카트리지', '1', '68,000'),
            ('3공 바인더', '5', '12,500'),
        ], '107,500'),
        ('한빛문구', '2026-11-19 10:05', [
            ('포스트잇', '10', '15,000'),
            ('볼펜 (12입)', '3', '9,600'),
        ], '24,600'),
    ]
    for index, (shop, when, items, total) in enumerate(receipts):
        page = Image.new('RGB', PAGE, (90, 90, 95))  # 책상 배경
        paper = Image.new('RGB', (760, 1400), (250, 250, 247))
        d = ImageDraw.Draw(paper)
        y = 60
        d.text((380, y), shop, font=font(46), fill=INK, anchor='ma'); y += 90
        d.text((380, y), '사업자번호 000-00-00000', font=font(26), fill=INK, anchor='ma'); y += 50
        d.text((380, y), '영 수 증 (신용카드 매출전표)', font=font(30), fill=INK, anchor='ma'); y += 80
        d.text((50, y), f'거래일시  {when}', font=font(28), fill=INK); y += 60
        d.line([(40, y), (720, y)], fill=INK, width=2); y += 20
        d.text((50, y), '품명', font=font(28), fill=INK)
        d.text((480, y), '수량', font=font(28), fill=INK)
        d.text((710, y), '금액', font=font(28), fill=INK, anchor='ra'); y += 50
        for name, qty, price in items:
            d.text((50, y), name, font=font(28), fill=INK)
            d.text((500, y), qty, font=font(28), fill=INK)
            d.text((710, y), price, font=font(28), fill=INK, anchor='ra'); y += 50
        d.line([(40, y + 10), (720, y + 10)], fill=INK, width=2); y += 40
        d.text((50, y), '합계 금액', font=font(34), fill=INK)
        d.text((710, y), f'{total}원', font=font(34), fill=INK, anchor='ra'); y += 70
        d.text((50, y), '결제 수단  법인카드 (삼성 ****-1234)', font=font(26), fill=INK); y += 45
        d.text((50, y), '승인 번호  30012345', font=font(26), fill=INK); y += 45
        d.text((50, y), '부가세 포함', font=font(26), fill=INK); y += 90
        d.text((380, y), '감사합니다', font=font(30), fill=INK, anchor='ma')
        paper = paper.rotate(-2.0 if index == 0 else 1.5, resample=Image.BICUBIC, expand=True,
                             fillcolor=(90, 90, 95))
        page.paste(paper, ((PAGE[0] - paper.width) // 2, 150))
        pages.append(scanned(page, angle=0.5, seed=10 + index))
    path = os.path.join(OUT, '법인카드_영수증_스캔.pdf')
    pages[0].save(path, save_all=True, append_images=pages[1:], resolution=150)
    return path


def main():
    os.makedirs(DOCUMENTS, exist_ok=True)
    for path in (make_leave_request_png(), make_receipt_image_pdf()):
        shutil.copy(path, DOCUMENTS)
        print('생성:', os.path.relpath(path, OUT))


if __name__ == '__main__':
    main()
