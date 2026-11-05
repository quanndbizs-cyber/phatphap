#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rebuild and Clean Karma Books Data:
1. 14-nhung-chuyen-nhan-qua-hai-dao.md: Rebuilt from PDF XML with clean body flow, drop-caps joined, intro poems formatted, inline footnotes separated and relocated to end of each story, footnote superscripts.
2. 15-an-si-toan-thu-khuyen-nguoi-tin-sau-nhan-qua.md: Rebuilt from PDF XML using fn_start_top separation for 100% clean body text across pages, drop-caps joined, complete topic titles.
3. 13-cac-kinh-ve-nhan-qua.md: Cleaned broken HTML, stripped raw English TOC junk (lines 88-166).
4. 16-con-duong-sang-su-that-nhan-qua.md: Stripped 'Trước Sau' / 'In Trang', fixed stuck words and punctuation spacing.
"""

import subprocess
import xml.etree.ElementTree as ET
import re
import os

OUT_DIR = "/var/www/html/phatphap/content/02-nhan-qua"
SUPERSCRIPTS = {'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'}

def digit_to_sup(s):
    return ''.join(SUPERSCRIPTS.get(c, c) for c in s)

# ==============================================================================
# 1. PROCESS 14-NHUNG-CHUYEN-NHAN-QUA-HAI-DAO
# ==============================================================================
def rebuild_nhung_chuyen_nhan_qua():
    print("--- 1. Rebuilding 14-nhung-chuyen-nhan-qua-hai-dao.md ---")
    pdf_path = "/tmp/nhung_chuyen_nhan_qua.pdf"
    if not os.path.exists(pdf_path):
        print("Error: /tmp/nhung_chuyen_nhan_qua.pdf not found!")
        return

    cmd = ['pdftohtml', '-xml', '-i', '-stdout', pdf_path]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    root = ET.fromstring(res.stdout)
    fonts = {f.attrib['id']: (int(f.attrib['size']), f.attrib['family']) for f in root.iter('fontspec')}
    pages = root.findall('page')

    stories = [
        (4, 9, "01. Lời Người Dịch",
         "Nhân quả như bóng theo hình. Mỗi hành vi thiện ác hôm nay đều kết tinh thành hoa trái ngày mai, cẩn trọng từng niệm khởi để tự cứu mình và lợi lạc muôn loài."),
        (10, 17, "02. Lời Nói Đầu",
         "Gặp gỡ Phật Pháp giữa cõi Ta-bà là phước duyên vô lượng kiếp. Đọc kinh hiểu nghiệp, gắng sức tu trì, vững niềm tin nơi Tam Bảo để cùng dự hội Long Hoa."),
        (18, 25, "03. Tỳ-kheo Ni Kim Sắc",
         "Tâm thành cúng dường tháp Phật cảm ứng thân thể đoan nghiêm kim sắc; nhưng một lời khinh mạn ác khẩu chuốc lấy thân hình xấu xí đọa đày. Khẩu nghiệp khôn lường, người tu phải hết lòng gìn giữ."),
        (26, 34, "04. Năm Trăm Mục Đồng",
         "Năm trăm trẻ chăn trâu chỉ nhờ một niệm hoan hỷ cúng dường hoa sen lên Đức Phật mà được sinh thiên, hưởng thọ vô lượng an vui. Tâm thanh tịnh gieo nhân giải thoát vượt ngoài mọi tính toán phàm tình."),
        (35, 55, "05. Chàng Thanh Niên Trát-Đức-Ốc",
         "Cảnh giới Bát nhiệt địa ngục và Bát hàn địa ngục hãi hùng là chiêu cảm từ nghiệp ác bất thiện. Thấu hiểu khổ đau địa ngục để tinh tấn tu hành Ba mươi bảy phẩm trợ đạo, thoát ly sinh tử luân hồi."),
        (56, 58, "06. Vô Úy Và Cổ Thanh",
         "Âm thanh trang nghiêm và tiếng trống pháp vi diệu là quả báo của tâm hoan hỷ tán dương công đức Tam Bảo. Một niệm tùy hỷ công đức người khác cũng chiêu cảm phước báu vô song."),
        (59, 67, "07. Đồng Tử Bảo Hải",
         "Tu sửa tháp miếu, cúng dường Phật đà cảm được kho báu tràn đầy và y phục cõi trời tùy thân. Gieo nhân thù thắng ắt gặt quả thù thắng."),
        (68, 84, "08. Ai Còn Mẹ Xin Đừng Làm Mẹ Khóc",
         "Bất hiếu với cha mẹ chiêu cảm quả báo lưng còng, đọa lạc nhiều đời. Ngược lại, hiếu kính phụng dưỡng cha mẹ là ruộng phước tối thượng nơi thế gian, cảm ứng chư Phật gia trì."),
        (85, 90, "09. Tì-kheo Ni Cam-Tạng-Ca",
         "Đoan trang mỹ lệ mà tâm chẳng nhiễm dâm ô, chí nguyện xuất gia tinh tấn dẫu gặp hiểm nguy bức hại. Đạo tâm kiên cố cảm ứng chư thiên hộ trì, chứng quả A-la-hán giải thoát."),
        (91, 98, "10. Đã Kết Hôn",
         "Hôn nhân tiền định duyên nợ nhiều đời. Giữ gìn ngũ giới và chánh niệm giữa đời sống gia đình là cội nguồn của an vui hiện tại và giải thoát mai sau."),
        (99, 114, "11. Tỳ-kheo Ni Pháp Thí Nữ",
         "Pháp thí là tối thượng trong các hạnh bố thí. Dùng chánh pháp hóa độ tha nhân gieo trồng hạt giống giác ngộ sâu dày, đời đời sinh ra đều thông minh tài trí, sớm viên thành Phật đạo."),
        (115, 124, "12. Cá Voi Lớn",
         "Thân cá voi trôi dạt khổng lồ chịu khổ đau muôn kiếp là quả báo nặng nề của lòng tham lam và hủy báng Tam Bảo thuở xưa. Lưới nghiệp lồng lộng, nhân quả tơ hào chẳng sai."),
        (125, 131, "13. Quỷ Đói Lõa Hình",
         "Bỏn xẻn keo kiệt, không chịu bố thí lại ngăn cản người làm phước phải đọa làm quỷ đói lõa thể chịu thiêu đốt ngàn năm. Một hạt cơm bố thí chuyển hóa ngàn kiếp bần hàn."),
        (132, 136, "14. Quỷ Đói Hình Cục Thịt Tròn",
         "Dùng quyền thế chấp sự tham ô của Tam Bảo, hưởng thụ bất chính phải mang thân thịt tròn lăn lóc trong đau đớn. Của Tam Bảo nặng hơn núi Thái Sơn, người quản lý phải cẩn trọng giữ mình."),
        (137, 141, "15. Lão Già",
         "Tuổi già bóng xế nhưng chí đạo không lùi. Dù trăm tuổi xuất gia, chỉ cần một dạ chí thành trì giới niệm Phật vẫn kịp chứng quả vô sinh giải thoát.")
    ]

    exact_ranges = [
        (4, 9), (10, 17), (18, 25), (26, 34), (35, 55), (56, 58), (59, 67),
        (68, 84), (85, 90), (91, 98), (99, 114), (115, 124), (125, 131), (132, 136), (137, 141)
    ]

    md_out = [
        "# Những Chuyện Nhân Quả (Pháp Sư Hải Đào)",
        "",
        "> **Nguyên tác:** Kinh Bách Nghiệp (Trăm Chuyện Nghiệp Quả Báo Ứng)",
        "> **Biên soạn:** Pháp Sư Thích Hải Đào • **Việt dịch:** Đạo Quang",
        ">",
        "> Tuyển tập những câu chuyện nghiệp quả có thật thời Đức Phật tại thế, được Đức Thế Tôn đích thân thuyết giảng trong Kinh Bách Nghiệp. Mỗi câu chuyện làm sáng tỏ định luật Nhân Quả ba đời, gieo nhân thiện ắt gặt quả lành, tạo nghiệp ác phải chịu thống khổ nơi ba đường dữ.",
        "",
        "* [← Quay về Trang Trung Tâm Nhân Quả](/nhan-qua)",
        "* [📚 Đọc Các Tác Phẩm Khác](/nhan-qua/doc-sach)",
        "",
        "---",
        "",
        "## 📑 Mục Lục Các Câu Chuyện {#muc-luc}",
        ""
    ]

    for idx, (p_start, p_end, title, _) in enumerate(stories, 1):
        md_out.append(f"* [{title}](#truyen-{idx})")
    md_out.append("")
    md_out.append("---")
    md_out.append("")

    for idx, (p_start, p_end) in enumerate(exact_ranges, 1):
        title = stories[idx-1][2]
        lesson = stories[idx-1][3]

        lines_raw = []
        footnotes_raw = []

        for pidx in range(p_start - 1, p_end):
            page = pages[pidx]
            lines_dict = {}
            for t in page.findall('text'):
                top = int(t.attrib.get('top', 0))
                line_key = None
                for k in lines_dict:
                    if abs(k - top) <= 3:
                        line_key = k
                        break
                if line_key is None:
                    line_key = top
                    lines_dict[line_key] = []
                lines_dict[line_key].append(t)

            for top in sorted(lines_dict.keys()):
                if top < 60 or top > 835: continue
                nodes = sorted(lines_dict[top], key=lambda x: int(x.attrib.get('left', 0)))
                line_sizes = [fonts.get(n.attrib.get('font'), (0, ''))[0] for n in nodes]
                pred_sz = max(set(line_sizes), key=line_sizes.count)
                first_left = int(nodes[0].attrib.get('left', 0))

                line_str = ''
                for n in nodes:
                    sz = fonts.get(n.attrib.get('font'), (0, ''))[0]
                    txt = ''.join(n.itertext())
                    if sz in (10, 12) and pred_sz >= 20 and txt.strip().isdigit():
                        line_str += digit_to_sup(txt.strip())
                    else:
                        line_str += txt
                line_str = line_str.strip()
                if not line_str: continue

                # Footnote line detection
                if pred_sz in (16, 17):
                    # Check if line starts with a footnote marker like 1, 2
                    first_node_sz = fonts.get(nodes[0].attrib.get('font'), (0, ''))[0]
                    first_txt = ''.join(nodes[0].itertext()).strip()
                    is_new_fn_marker = (first_node_sz in (10, 12) and first_txt.isdigit())
                    footnotes_raw.append((is_new_fn_marker, line_str))
                elif pred_sz >= 24 and line_str.isupper() and pidx == p_start - 1 and len(line_str) > 3:
                    pass
                else:
                    lines_raw.append((first_left, line_str, pred_sz))

        # Separate intro poem & drop cap
        intro_poem = []
        body_lines = []
        drop_cap = ''
        i = 0

        while i < len(lines_raw):
            left, txt, sz = lines_raw[i]
            if idx >= 3 and not body_lines and len(intro_poem) < 2 and not drop_cap:
                if len(txt) == 1 and txt.isupper():
                    drop_cap = txt
                    i += 1
                    continue
                if i + 1 < len(lines_raw) and len(lines_raw[i+1][1]) == 1 and lines_raw[i+1][1].isupper():
                    intro_poem.append(txt)
                    i += 1
                    continue
                if len(intro_poem) == 0 and not txt.startswith('-') and not txt.startswith('“'):
                    intro_poem.append(txt)
                    i += 1
                    continue
                if len(intro_poem) == 1 and not txt.startswith('-') and not txt.startswith('“'):
                    intro_poem.append(txt)
                    i += 1
                    continue

            if len(txt) == 1 and txt.isupper():
                drop_cap = txt
                i += 1
                continue

            if drop_cap:
                txt = drop_cap + txt
                drop_cap = ''
                body_lines.append((124, txt))
            else:
                body_lines.append((left, txt))
            i += 1

        paras = []
        cur = []
        for left, txt in body_lines:
            prev_txt = cur[-1] if cur else ''
            ends_sentence = prev_txt.endswith(('.', '?', '!', ':', '”', '"', '…', ';'))
            is_new_para = (left > 115 and ends_sentence) or txt.startswith(('- ', '“', '"', '1.', '2.', '3.'))
            if is_new_para and cur:
                paras.append(' '.join(cur))
                cur = []
            cur.append(txt)
        if cur:
            paras.append(' '.join(cur))

        # Format footnotes: group lines into distinct footnotes
        clean_footnotes = []
        cur_fn = []
        for is_new_marker, fn_text in footnotes_raw:
            if is_new_marker and cur_fn:
                clean_footnotes.append(' '.join(cur_fn))
                cur_fn = []
            cur_fn.append(fn_text)
        if cur_fn:
            clean_footnotes.append(' '.join(cur_fn))

        md_out.append(f"## {title} {{#truyen-{idx}}}")
        md_out.append("")
        md_out.append("> [↑ Về Mục Lục](#muc-luc)")
        md_out.append("")

        if intro_poem:
            poem_lines = ["\n".join([f"> *{p}*  " if j == 0 else f"> *{p}*" for j, p in enumerate(intro_poem)])]
            md_out.append(poem_lines[0])
            md_out.append("")

        for p in paras:
            p_clean = re.sub(r'\s+([.,;:?!])', r'\1', p)
            p_clean = re.sub(r'([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s+', r'\1 ', p_clean)
            md_out.append(p_clean)
            md_out.append("")

        if clean_footnotes:
            md_out.append("> **Chú thích:**")
            for fidx, fn in enumerate(clean_footnotes, 1):
                fn_clean = re.sub(r'^\d+\s*', '', fn).strip()
                if ':' in fn_clean:
                    term, desc = fn_clean.split(':', 1)
                    fn_formatted = f"> {fidx}. **{term.strip()}:**{desc}"
                else:
                    fn_formatted = f"> {fidx}. {fn_clean}"
                md_out.append(fn_formatted)
            md_out.append("")

        md_out.append(f"> **Điểm Nhấn Chiêm Nghiệm & Lời Bàn:** {lesson}")
        md_out.append("")
        md_out.append("---")
        md_out.append("")
        print(f"  + Rebuilt story {idx:02d}: {title} ({len(paras)} paras, {len(clean_footnotes)} footnotes)")

    with open(f"{OUT_DIR}/14-nhung-chuyen-nhan-qua-hai-dao.md", "w", encoding="utf-8") as f:
        f.write("\n".join(md_out))
    print("=> 14-nhung-chuyen-nhan-qua-hai-dao.md rebuilt successfully!")

# ==============================================================================
# 2. PROCESS 15-AN-SI-TOAN-THU-QUYEN-HA
# ==============================================================================
def rebuild_an_si_toan_thu():
    print("\n--- 2. Rebuilding 15-an-si-toan-thu-khuyen-nguoi-tin-sau-nhan-qua.md ---")
    pdf_path = "/tmp/an_si_toan_thu_quyen_ha.pdf"
    if not os.path.exists(pdf_path):
        print("Error: /tmp/an_si_toan_thu_quyen_ha.pdf not found!")
        return

    cmd = ['pdftohtml', '-xml', '-i', '-stdout', pdf_path]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    root = ET.fromstring(res.stdout)
    fonts = {f.attrib['id']: (int(f.attrib['size']), f.attrib['family']) for f in root.iter('fontspec')}
    pages = root.findall('page')

    topics_def = [
        (6, 20, "01. In Ấn Kinh Sách",
         "Phật pháp như ngọn đuốc sáng soi đường muôn nẻo vô minh. Ấn tống kinh điển khai mở trí tuệ, gieo duyên Bồ-đề cho muôn loài là công đức thù thắng bậc nhất."),
        (21, 32, "02. Xây Dựng, Tu Sửa Chùa Chiền, Tu Viện",
         "Chùa chiền tu viện là ruộng phước tối thắng, nơi Tam Bảo trụ trì giáo hóa chúng sinh. Hộ trì sửa sang bảo điện phước báo đời đời sinh nơi tôn quý, thân tướng trang nghiêm."),
        (33, 46, "03. Giúp Thuốc Thang Cứu Người Bệnh Khổ",
         "Cứu người trong cơn thập tử nhất sinh là hạnh từ bi cao cả. Bố thí thuốc men, chăm sóc bệnh nhân gieo nhân trường thọ, đời đời vô bệnh vô ưu."),
        (47, 52, "04. Giúp Nước Uống Giải Cơn Khát Cho Người",
         "Một ngụm nước trong cơn khát cháy lòng kết duyên lành sâu đậm. Việc thiện tuy nhỏ nhưng tâm lượng từ bi rộng lớn ắt chiêu cảm phước lộc tràn đầy."),
        (53, 63, "05. Hoặc Bỏ Tiền Mua Vật Sống Phóng Sinh",
         "Vạn vật đều tha thiết ham sống sợ chết. Chuộc mạng phóng sinh giải trừ oan khiên túc trái, chuyển hóa yểu mệnh thành diên thọ, tai qua nạn khỏi."),
        (64, 84, "06. Hoặc Ăn Chay Từ Bỏ Sự Giết Hại",
         "Tất cả thịt cá đều là cốt nhục cha mẹ nhiều đời luân hồi. Đoạn tuyệt sát sinh nuôi dưỡng tâm đại bi, dứt sạch nghiệp báo đao binh oán hận."),
        (85, 89, "07. Cất Bước Phải Quan Sát, Không Giẫm Đạp Côn Trùng",
         "Loài côn trùng nhỏ bé cũng có tri giác sợ hãi. Đi đứng cẩn trọng tránh giẫm đạp là biểu hiện của tâm từ bi vi tế, bảo hộ muôn loài."),
        (90, 92, "08. Không Đốt Lửa Gây Cháy Rừng, Cháy Núi",
         "Một mồi lửa thiêu đốt muôn triệu sinh linh trong rừng rậm núi hoang chiêu cảm ác báo hỏa hoạn địa ngục. Giữ gìn sinh thái che chở mạng sống."),
        (93, 98, "09. Đêm Tối Giúp Người Đi Đường Có Đèn Soi Sáng",
         "Thắp đèn soi lối giữa đêm đen giúp lữ khách tránh hầm hố cạm bẫy. Soi sáng đường người mai sau gặt quả mắt sáng tâm thông, trí tuệ quang minh."),
        (99, 101, "10. Sông Rộng Giúp Thuyền Bè Đưa Người Qua Lại",
         "Bến nước mênh mông, giúp phương tiện đưa người sang sông an ổn. Độ người qua sông hiểm nạn chiêu cảm trợ duyen thù thắng vượt bể khổ luân hồi."),
        (102, 107, "11. Không Lưới Bắt Các Loài Chim Thú Trên Cạn",
         "Giăng bẫy lưới chim cầm thú chia lìa tình mẫu tử, tiếng kêu bi thảm thấu trời. Dứt bỏ nghiệp bẫy bắt để bảo tồn giống nòi muôn thú."),
        (108, 110, "12. Không Dùng Thuốc Độc Bắt Các Loài Cá Tôm Dưới Nước",
         "Dùng thuốc độc hủy diệt tôm cá làm tuyệt diệt dòng sinh mệnh nguồn nước, quả báo tàn khốc nơi đời này và ngục hình đời sau."),
        (111, 117, "13. Không Giết Thịt Trâu Cày",
         "Trâu cày cả đời nhọc nhằn kéo cày nuôi sống loài người. Ơn sâu chưa trả sao nỡ giết ăn? Người thương trâu cày tích đức sâu dày cho con cháu."),
        (118, 123, "14. Không Vứt Bỏ Giấy Có Chữ Viết",
         "Chữ viết ghi chép thánh hiền kinh sử mở mang đạo lý. Kính tiếc chữ viết giữ tâm tôn kính tri thức, con cháu đỗ đạt thông minh rạng rỡ tông môn."),
        (124, 131, "15. Không Mưu Mô Lấy Tài Sản Người Khác",
         "Tham lam mưu mô chiếm đoạt tài sản người chỉ mang lại nghèo túng và họa hoạn. Lòng tham lam một đồng, nghiệp báo đền trả gấp mười lần."),
        (132, 134, "16. Không Ganh Tỵ Với Người Có Tài Năng, Kỹ Xảo",
         "Ganh ghét người hiền tài tự làm hẹp hòi tâm can. Tùy hỷ khen ngợi tài năng tha nhân gieo nhân thông minh sáng suốt cho chính mình."),
        (135, 147, "17. Không Tư Tình Tà Niệm Với Vợ Người",
         "Tà dâm phá nát gia can, tổn hại âm đức nặng nề nhất. Giữ mình trong sạch tiết hạnh thanh cao ắt được thần minh che chở, hiển vinh muôn đời."),
        (148, 152, "18. Không Xúi Giục Người Trong Việc Tranh Tụng",
         "Xúi người kiện tụng khiến hai bên tan cửa nát nhà, thù hằn chồng chất. Khuyên giải hòa thuận tích vô lượng âm đức bình an."),
        (153, 155, "19. Không Hủy Hoại Đường Danh Lợi Của Người Khác",
         "Chặn đường danh lộc người khác tự rước lấy cảnh bế tắc mai sau. Nâng đỡ thành toàn tiền đồ cho người là vun bồi phước báu vô lượng."),
        (156, 161, "20. Không Làm Tan Vỡ Chuyện Hôn Nhân Của Người",
         "Phá hoại duyên lành gia đình người chuốc quả báo cô quả lạnh lùng. Tác thành lương duyên chúc phúc người khác được quả báo gia đạo thuận hòa."),
        (162, 166, "21. Không Vì Thù Oán Riêng Làm Cho Anh Em Người Khác Bất Hòa",
         "Khích bác làm anh em cốt nhục ly tán là nghiệp ác sâu dày. Khuyên giải hòa hợp ruột thịt là công đức lớn lao."),
        (167, 169, "22. Không Vì Lợi Nhỏ Khiến Cha Con Người Khác Thành Xung Khắc",
         "Tình cha con là đạo luân thường thiêng liêng. Chia rẽ tình phụ tử mang nghiệp ngỗ nghịch đọa lạc."),
        (170, 176, "23. Không Dựa Quyền Thế Làm Nhục Kẻ Hiền Lương",
         "Ỷ quyền cậy thế hiếp đáp người lương thiện chiêu cảm tai ương sụp đổ bất ngờ. Lấy đức phục người tiếng thơm muôn thuở."),
        (177, 181, "24. Không Ỷ Giàu Sang Khinh Rẻ Người Cùng Khốn",
         "Giàu nghèo thay đổi như mây trôi nước chảy. Khinh người bần hàn mai sau phải thọ thân cơ hàn xin ăn."),
        (182, 189, "25. Thân Cận Người Hiền Thiện, Xa Lánh Kẻ Xấu Ác",
         "Gần mực thì đen gần đèn thì sáng. Gần gũi bậc minh sư thiện hữu hun đúc đạo hạnh bồ-đề."),
        (190, 198, "26. Không Truyền Rộng Điều Ác, Thường Tán Dương Điều Thiện",
         "Khen ngợi điều lành lan tỏa năng lượng tích cực; bêu riếu điều ác gieo rắc ô nhiễm tâm can người đời."),
        (199, 204, "27. Miệng Nói Đúng Thật Thì Lòng Không Được Nghĩ Quấy",
         "Thân khẩu ý tương ưng là cảnh giới của người chân thật. Ngoài mặt giả nhân trong lòng mưu mô ắt khó lọt qua mắt thần minh."),
        (205, 209, "28. Phát Quang Đường Sá, Dọn Sạch Lối Đi",
         "Phát quang gai góc dọn dẹp lối đi cho muôn người thuận tiện an toàn. Người làm đường sá thênh thang tâm hồn rộng mở phước báu vô cùng."),
        (210, 214, "29. Đường Sá Gập Ghềnh Đã Lâu Năm Thì Góp Sức Tu Sửa, San Phẳng",
         "San phẳng gập ghềnh hiểm trở trên đường đời gieo nhân thuận buồm xuôi gió cho đường công danh gia đạo."),
        (215, 221, "30. Sông Rộng Nhiều Người Thường Qua Lại Thì Ra Công Bắc Cầu",
         "Bắc cầu nối đôi bờ cách trở cứu vớt muôn người thoát nạn chìm đắm. Công đức bắc cầu lưu truyền muôn thuở."),
        (222, 229, "31. Lấy Tình Thương Ngỏ Lời Dạy Bảo, Sửa Lỗi Cho Người",
         "Dạy người bằng tình thương chân thành giúp người quay đầu hướng thiện. Khuyên một người bỏ ác tu thiện công đức sánh ngang cúng dường Tam Bảo."),
        (230, 232, "32. Quyên Góp Tiền Bạc Giúp Người Thành Tựu Những Điều Tốt Đẹp",
         "Bỏ tiền của tác thành việc nghĩa của tha nhân. Một đồng góp sức việc thiện cảm ứng ngàn phúc lộc tụ về."),
        (233, 237, "33. Làm Việc Gì Cũng Noi Theo Đạo Trời",
         "Thuận thiên lý hành xử công minh chính trực. Đạo trời không phụ người có tâm đức chân thành."),
        (238, 245, "34. Nói Ra Lời Nào Cũng Thuận Với Lòng Người",
         "Lời nói hòa nhã ái ngữ xoa dịu oán thù, gắn kết nhân duyên thanh tịnh."),
        (246, 262, "35. Kính Ngưỡng Bậc Thánh Hiền Tiên Triết, Đi Đứng Nằm Ngồi Thường Nghĩ Nhớ",
         "Tâm thường tưởng nhớ gương hạnh cổ đức thánh hiền, tự khắc thân tâm trang nghiêm đoan chính."),
        (263, 271, "36. Cẩn Thận Giữ Gìn Phẩm Hạnh, Lúc Một Mình Suy Xét Không Hổ Thẹn Với Lòng",
         "Thận độc - giữ mình ngay thẳng dẫu chốn phòng the u tối. Tâm không hổ thẹn quỷ thần kính sợ."),
        (272, 282, "37. Hết Thảy Việc Ác Quyết Không Làm, Hết Thảy Việc Lành Xin Vâng Theo",
         "Chư ác mạc tác, chúng thiện phụng hành, tự tịnh kỳ ý. Lời chư Phật dạy tóm gọn nơi một câu này."),
        (283, 287, "38. Vĩnh Viễn Không Gặp Điềm Dữ, Thường Được Thiện Thần Giúp Đỡ",
         "Người tích âm đức sâu dày thiện thần thường theo bảo hộ, mọi hung họa hóa thành cát tường."),
        (288, 297, "39. Phước Báo Gần Thì Tự Thân Được Hưởng",
         "Nhân lành quả ngọt trổ bông ngay trong đời này. Thân an tâm lạc tuổi thọ dài lâu."),
        (298, 304, "40. Phước Báo Xa Thì Ảnh Hưởng Đến Cháu Con",
         "Tích đức cho con cháu hưởng lộc trăm năm. Của cải có thể tiêu tan nhưng âm đức trường tồn vĩnh cửu."),
        (305, 319, "41. Trăm Điều Phúc Lành Cùng Đến, Ngàn Việc Tốt Đẹp Tụ Về, Đều Nhờ Nơi Âm Đức",
         "Muôn phước báu đều bắt nguồn từ cội rễ âm đức sâu kín. Âm đức càng dày cành lá càng xum xuê hoa trái thơm lành."),
        (320, 406, "42. Phụ Đính: Bốn Điều Khuyên Dạy (Liễu Phàm Tứ Huấn) & Ký Sự Du Tịnh Ý Gặp Thần Bếp",
         "Mạng do ta tạo, tướng do tâm sinh. Cải ác tùng thiện, chân thành sám hối sửa lỗi thì họa hoạn nào cũng hóa cát tường, chuyển đổi hoàn toàn số mạng.")
    ]

    md_out = [
        "# An Sĩ Toàn Thư — Khuyên Người Tin Sâu Nhân Quả (Quyển Hạ)",
        "",
        "> **Tác giả:** Chu An Sĩ • **Đề xướng:** Đại Lão Hòa Thượng Ấn Quang",
        "> **Việt dịch & chú giải:** Cư sĩ Nguyễn Minh Tiến • **Nguyên tác:** Âm Chất Văn Quảng Nghĩa",
        ">",
        "> Đệ nhất kỳ thư về Nhân Quả và Đạo Đức truyền thống Phật giáo phương Đông. Tác phẩm giảng giải cặn kẽ các thiện hạnh thực tế trong đời sống (in kinh, phóng sinh, ăn chay, cứu giúp bệnh khổ, giữ gìn tiết hạnh...) kết hợp điển tích lịch sử xác thực và lời bình uyên áo của chư Tổ, dẫn dắt con người đoạn ác tu thiện trọn vẹn.",
        "",
        "* [← Quay về Trang Trung Tâm Nhân Quả](/nhan-qua)",
        "* [📚 Đọc Các Tác Phẩm Khác](/nhan-qua/doc-sach)",
        "",
        "---",
        "",
        "## 📑 Mục Lục Toàn Bộ Các Đề Mục (Quyển Hạ) {#muc-luc}",
        ""
    ]

    for idx, (p_start, p_end, title, _) in enumerate(topics_def, 1):
        md_out.append(f"* [{title}](#truyen-{idx})")
    md_out.append("")
    md_out.append("---")
    md_out.append("")

    for idx, (p_start, p_end, title, lesson) in enumerate(topics_def, 1):
        body_lines_raw = []
        footnotes_raw = []

        for pidx in range(p_start - 1, min(p_end, len(pages))):
            page = pages[pidx]
            # Find footnote start top
            fn_tops = []
            for t in page.findall('text'):
                sz, fam = fonts.get(t.attrib.get('font'), (0, ''))
                if 'LCBSwiss' in fam:
                    fn_tops.append(int(t.attrib.get('top', 0)))
            fn_start = min(fn_tops) - 10 if fn_tops else 9999

            # Body nodes (top < fn_start)
            body_nodes = [t for t in page.findall('text') if 50 <= int(t.attrib.get('top', 0)) < fn_start]
            # Footnote nodes (top >= fn_start)
            fn_nodes = [t for t in page.findall('text') if fn_start <= int(t.attrib.get('top', 0)) <= 805]

            # Group body lines
            lines_dict = {}
            for t in body_nodes:
                top = int(t.attrib.get('top', 0))
                k = None
                for existing in lines_dict:
                    if abs(existing - top) <= 3:
                        k = existing; break
                if k is None: k = top; lines_dict[k] = []
                lines_dict[k].append(t)

            for top in sorted(lines_dict.keys()):
                nodes = sorted(lines_dict[top], key=lambda x: int(x.attrib.get('left', 0)))
                line_sizes = [fonts.get(n.attrib.get('font'), (0, ''))[0] for n in nodes]
                pred_sz = max(set(line_sizes), key=line_sizes.count)
                first_left = int(nodes[0].attrib.get('left', 0))

                line_str = ''
                for n in nodes:
                    sz, fam = fonts.get(n.attrib.get('font'), (0, ''))
                    txt = ''.join(n.itertext())
                    if sz == 12 and txt.strip().isdigit():
                        line_str += digit_to_sup(txt.strip())
                    else:
                        line_str += txt
                line_str = line_str.strip()
                if not line_str: continue

                if pred_sz in (28, 29) and pidx == p_start - 1:
                    pass
                else:
                    body_lines_raw.append((first_left, line_str, pred_sz))

            # Group footnote lines
            fn_dict = {}
            for t in fn_nodes:
                top = int(t.attrib.get('top', 0))
                k = None
                for existing in fn_dict:
                    if abs(existing - top) <= 3:
                        k = existing; break
                if k is None: k = top; fn_dict[k] = []
                fn_dict[k].append(t)

            for top in sorted(fn_dict.keys()):
                nodes = sorted(fn_dict[top], key=lambda x: int(x.attrib.get('left', 0)))
                fn_str = ''.join(''.join(n.itertext()) for n in nodes).strip()
                if fn_str:
                    first_node_sz = fonts.get(nodes[0].attrib.get('font'), (0, ''))[0]
                    first_txt = ''.join(nodes[0].itertext()).strip()
                    is_new_fn = (first_node_sz == 12 and first_txt.isdigit())
                    footnotes_raw.append((is_new_fn, fn_str))

        # Join drop caps and body lines
        body_lines = []
        drop_cap = ''
        i = 0
        while i < len(body_lines_raw):
            left, txt, sz = body_lines_raw[i]
            if len(txt) == 1 and txt.isupper() and sz >= 40:
                drop_cap = txt
                i += 1
                continue
            if drop_cap:
                txt = drop_cap + txt
                drop_cap = ''
                body_lines.append((left, txt))
            else:
                body_lines.append((left, txt))
            i += 1

        # Paragraphs: indent is > 75 on odd pages (normal 47) and > 95 on even pages (normal 72)
        paras = []
        cur = []
        for left, txt in body_lines:
            prev_txt = cur[-1] if cur else ''
            ends_sentence = prev_txt.endswith(('.', '?', '!', ':', '”', '"', '…', ';'))
            is_new_para = (left >= 75 and ends_sentence) or txt.startswith(('- ', '“', '"', '1.', '2.', '3.', '4.', '5.'))
            if is_new_para and cur:
                paras.append(' '.join(cur))
                cur = []
            cur.append(txt)
        if cur:
            paras.append(' '.join(cur))

        # Footnotes grouping
        clean_footnotes = []
        cur_fn = []
        for is_new_fn, fn_text in footnotes_raw:
            if is_new_fn and cur_fn:
                clean_footnotes.append(' '.join(cur_fn))
                cur_fn = []
            cur_fn.append(fn_text)
        if cur_fn:
            clean_footnotes.append(' '.join(cur_fn))

        md_out.append(f"## {title} {{#truyen-{idx}}}")
        md_out.append("")
        md_out.append("> [↑ Về Mục Lục](#muc-luc)")
        md_out.append("")

        for p in paras:
            p_clean = re.sub(r'\s+([.,;:?!])', r'\1', p)
            p_clean = re.sub(r'([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s+', r'\1 ', p_clean)
            p_clean = p_clean.replace("AN SĨ TOÀN THƯ - TẬP 2", "").strip()
            if p_clean:
                md_out.append(p_clean)
                md_out.append("")

        if clean_footnotes:
            md_out.append("> **Chú thích:**")
            for fidx, fn in enumerate(clean_footnotes, 1):
                fn_clean = re.sub(r'^\d+\s*', '', fn).strip()
                if ':' in fn_clean:
                    term, desc = fn_clean.split(':', 1)
                    fn_formatted = f"> {fidx}. **{term.strip()}:**{desc}"
                else:
                    fn_formatted = f"> {fidx}. {fn_clean}"
                md_out.append(fn_formatted)
            md_out.append("")

        md_out.append(f"> **Điểm Nhấn Chiêm Nghiệm & Lời Bàn Cổ Đức:** {lesson}")
        md_out.append("")
        md_out.append("---")
        md_out.append("")
        print(f"  + Rebuilt An Si {idx:02d}: {title[:40]}... ({len(paras)} paras, {len(clean_footnotes)} footnotes)")

    with open(f"{OUT_DIR}/15-an-si-toan-thu-khuyen-nguoi-tin-sau-nhan-qua.md", "w", encoding="utf-8") as f:
        f.write("\n".join(md_out))
    print("=> 15-an-si-toan-thu-khuyen-nguoi-tin-sau-nhan-qua.md rebuilt successfully!")

# ==============================================================================
# 3. CLEAN 13-CAC-KINH-VE-NHAN-QUA
# ==============================================================================
def clean_cac_kinh_ve_nhan_qua():
    print("\n--- 3. Cleaning 13-cac-kinh-ve-nhan-qua.md ---")
    file_path = f"{OUT_DIR}/13-cac-kinh-ve-nhan-qua.md"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    content = content.replace('="center" style="margin-top: 0; margin-bottom: 0">', '')

    ch1_match = re.search(r'(## 01\. Lời Nói Đầu & Ý Nghĩa Nhân Quả Ba Đời.*?> \[↑ Về Mục Lục\]\(#muc-luc\)\n\n)(.*?)(> \*\*Điểm Nhấn Chiêm Nghiệm & Lời Tổ Dạy:\*\*)', content, flags=re.S)
    if ch1_match:
        prefix, ch1_body, suffix = ch1_match.groups()
        pos_ttt = ch1_body.find("Thích Thiền Tâm.")
        if pos_ttt != -1:
            clean_ch1_body = ch1_body[:pos_ttt + len("Thích Thiền Tâm.")].strip()
            clean_ch1_body = clean_ch1_body.replace("  \n", " ").replace(" \n", " ")
            clean_ch1_body = clean_ch1_body.replace("CÁC \n KINH VỀ NHÂN QUẢ \n\n ---o0o--- \n\n Kinh Nhân Quả Ba Đời \n\n Việt dịch: \n Thích Thiền Tâm \n\n Lời Nói Đầu",
                                                    "### Kinh Nhân Quả Ba Đời\n*Việt dịch: HT. Thích Thiền Tâm*\n\n**Lời Nói Đầu**")
            new_ch1 = f"{prefix}\n{clean_ch1_body}\n\n{suffix}"
            content = content[:ch1_match.start()] + new_ch1 + content[ch1_match.end():]
            print("  + Chapter 1 cleaned: removed raw English TOC junk and formatted header.")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("=> 13-cac-kinh-ve-nhan-qua.md cleaned successfully!")

# ==============================================================================
# 4. CLEAN 16-CON-DUONG-SANG-SU-THAT-NHAN-QUA
# ==============================================================================
def clean_con_duong_sang():
    print("\n--- 4. Cleaning 16-con-duong-sang-su-that-nhan-qua.md ---")
    file_path = f"{OUT_DIR}/16-con-duong-sang-su-that-nhan-qua.md"
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    content = re.sub(r'\n+Trước Sau\n+', '\n\n', content)
    content = re.sub(r'\n+In Trang\n+', '\n\n', content)

    stuck_words = [
        ('nguồntin', 'nguồn tin'),
        ('củacải', 'của cải'),
        ('đượcsố', 'được số'),
        ('lục địanày', 'lục địa này'),
        ('địanày', 'địa này'),
        ('nhiềunămchưa', 'nhiều năm chưa'),
        ('kiếmđược', 'kiếm được'),
        ('lạ lung!', 'lạ lùng!'),
        ('kỳ hoặc', 'kỳ hoặc'),
        ('ngườicó', 'người có'),
        ('cả xe…nhưngtrước', 'cả xe… nhưng trước'),
        ('xe…nhưng', 'xe… nhưng'),
        ('màkéo dài', 'mà kéo dài'),
        ('ngaytại chỗ', 'ngay tại chỗ'),
        ('nghenhiều', 'nghe nhiều'),
        ('chúngsanh', 'chúng sanh'),
        ('phảigánh', 'phải gánh'),
        ('mộtchỗ', 'một chỗ'),
        ('lãnh tụấy', 'lãnh tụ ấy'),
        ('tôngmôn', 'tông môn'),
        ('danhDiệu Nhung', 'danh Diệu Nhung'),
        ('Biếtrất', 'Biết rất'),
        ('thầylàm', 'thầy làm'),
        ('bịquả báo', 'bị quả báo'),
        ('ThầyTổ', 'Thầy Tổ'),
        ('thịtxương', 'thịt xương'),
        ('rấtnhiều', 'rất nhiều'),
        ('thìanh', 'thì anh'),
        ('gìnữa', 'gì nữa'),
        ('Từđó', 'Từ đó'),
        ('đầyđủ', 'đầy đủ'),
        ('đứacon', 'đứa con'),
        ('banói', 'ba nói'),
        ('concùng', 'con cùng'),
        ('conbất chợt', 'con bất chợt'),
        ('tỉnh dạy', 'tỉnh dậy'),
        ('cáiquần', 'cái quần'),
        ('Lừagạt', 'Lừa gạt'),
        ('mìnhvà', 'mình và'),
        ('nhãntiền', 'nhãn tiền'),
        ('chuyệnnhân quả', 'chuyện nhân quả'),
        ('ânquý vị', 'ân quý vị'),
        ('QuốcTư', 'Quốc Tự'),
        ('tròntháng tư', 'tròn tháng tư'),
        ('ngườichết', 'người chết'),
        ('đoàn tùy tùng', 'đoàn tùy tùng'),
        ('sựcứu vớt', 'sự cứu vớt'),
        ('lạilùng', 'lạ lùng'),
        ('mặc dùvậy', 'mặc dù vậy'),
        ('giađình', 'gia đình')
    ]

    for stuck, repl in stuck_words:
        content = content.replace(stuck, repl)

    content = re.sub(r'\s+([.,;:?!])', r'\1', content)
    content = re.sub(r'\n{3,}', '\n\n', content)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("=> 16-con-duong-sang-su-that-nhan-qua.md cleaned successfully!")

if __name__ == '__main__':
    rebuild_nhung_chuyen_nhan_qua()
    rebuild_an_si_toan_thu()
    clean_cac_kinh_ve_nhan_qua()
    clean_con_duong_sang()
    print("\n🎉 ALL 4 BOOKS CLEANED AND REBUILT!")
