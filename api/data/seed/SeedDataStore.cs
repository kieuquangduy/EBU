using System;
using System.Collections.Generic;
using System.Linq;
using api.models.entities;

namespace api.data.seed
{
    public static class SeedDataStore
    {
        private sealed record CustomShirtSeedSpec(
            string Id,
            string Sku,
            string Name,
            string Slug,
            string CategoryId,
            string BrandId,
            string Color,
            decimal Price,
            string ImageKey,
            string ImageUrl,
            string Description);

        private static readonly (string Size, int Stock)[] StandardSizes =
        {
            ("S", 25),
            ("M", 40),
            ("L", 40),
            ("XL", 25),
        };

        private static readonly List<CustomShirtSeedSpec> ShirtSpecs = new()
        {
            // ── 15 Áo Có Cổ (Polo Custom) ─────────────────────────────────────────
            new(
                "P1", "HS-PL-01",
                "Áo Polo Custom 10A1 Cùng Nhau Vươn Xa",
                "ao-polo-custom-10a1-cung-nhau-vuon-xa",
                "CAT_POLO", "B2", "Xanh Navy", 139000m,
                "haushop/product/custom/ao-co-co-01",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476872/haushop/product/custom/ao-co-co-01.png",
                "Áo polo custom cổ bẻ phối viền trắng, chất liệu cá sấu cotton thoáng mát. Hỗ trợ tùy chỉnh tên lớp, logo và slogan in lưng sắc nét."),
            new(
                "P2", "HS-PL-02",
                "Áo Polo Custom 11A2 Một Lớp Một Nhà",
                "ao-polo-custom-11a2-mot-lop-mot-nha",
                "CAT_POLO", "B2", "Đen Phối Kem", 145000m,
                "haushop/product/custom/ao-co-co-02",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476876/haushop/product/custom/ao-co-co-02.png",
                "Áo polo custom tông đen phối cổ và bo tay màu kem sang trọng, họa tiết vương miện và vòng nguyệt quế có thể tùy biến theo tên tập thể."),
            new(
                "P3", "HS-PL-03",
                "Áo Polo Custom 12A3 Giữ Lửa Tuổi Trẻ",
                "ao-polo-custom-12a3-giu-lua-tuoi-tre",
                "CAT_POLO", "B2", "Xanh Rêu Đậm", 129000m,
                "haushop/product/custom/ao-co-co-03",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476880/haushop/product/custom/ao-co-co-03.png",
                "Áo polo custom xanh rêu phối cổ trắng viền vai trẻ trung, thiết kế in huy hiệu ngực và họa tiết núi rừng mặt sau theo yêu cầu."),
            new(
                "P4", "HS-PL-04",
                "Áo Polo Custom 10B1 Bầu Trời Của Chúng Mình",
                "ao-polo-custom-10b1-bau-troi-cua-chung-minh",
                "CAT_POLO", "B1", "Xanh Thiên Thanh", 125000m,
                "haushop/product/custom/ao-co-co-04",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476882/haushop/product/custom/ao-co-co-04.png",
                "Áo polo custom xanh da trời phối cổ xanh navy năng động, họa tiết đám mây và cầu vồng tươi sáng phù hợp làm đồng phục lớp và câu lạc bộ."),
            new(
                "P5", "HS-PL-05",
                "Áo Polo Custom 11B2 Class Of 2027",
                "ao-polo-custom-11b2-class-of-2027",
                "CAT_POLO", "B2", "Đỏ Đô", 149000m,
                "haushop/product/custom/ao-co-co-05",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476885/haushop/product/custom/ao-co-co-05.png",
                "Áo polo custom đỏ đô phối cổ kem cổ điển, in logo huy hiệu trước ngực và thông điệp kỷ niệm khóa học phía sau theo yêu cầu."),
            new(
                "P6", "HS-PL-06",
                "Áo Polo Custom 12B3 Bay Cao Cùng Nhau",
                "ao-polo-custom-12b3-bay-cao-cung-nhau",
                "CAT_POLO", "B1", "Kem Phối Xanh Lá", 135000m,
                "haushop/product/custom/ao-co-co-06",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476887/haushop/product/custom/ao-co-co-06.png",
                "Áo polo custom màu kem phối cổ và bo tay xanh lá nổi bật, họa tiết tên lửa bay lên từ trang sách mang phong cách học đường sáng tạo."),
            new(
                "P7", "HS-PL-07",
                "Áo Polo Custom 10C1 Khám Phá Không Giới Hạn",
                "ao-polo-custom-10c1-kham-pha-khong-gioi-han",
                "CAT_POLO", "B1", "Tím Pastel", 128000m,
                "haushop/product/custom/ao-co-co-07",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476890/haushop/product/custom/ao-co-co-07.png",
                "Áo polo custom tím pastel phối cổ trắng thanh lịch, họa tiết thiên hà và hành tinh mặt sau dễ dàng cá nhân hóa tên lớp hoặc nhóm."),
            new(
                "P8", "HS-PL-08",
                "Áo Polo Custom 11C2 Năng Lượng Tuổi Trẻ",
                "ao-polo-custom-11c2-nang-luong-tuoi-tre",
                "CAT_POLO", "B3", "Xám Than Phối Cam", 148000m,
                "haushop/product/custom/ao-co-co-08",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476892/haushop/product/custom/ao-co-co-08.png",
                "Áo polo custom xám than phối cổ cam thể thao mạnh mẽ, họa tiết tia sét và vệt cọ năng động phù hợp team building và đồng phục lớp."),
            new(
                "P9", "HS-PL-09",
                "Áo Polo Custom 12C3 Cùng Chung Con Thuyền",
                "ao-polo-custom-12c3-cung-chung-con-thuyen",
                "CAT_POLO", "B2", "Xanh Dương", 132000m,
                "haushop/product/custom/ao-co-co-09",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476894/haushop/product/custom/ao-co-co-09.png",
                "Áo polo custom xanh dương phối cổ trắng, biểu tượng mỏ neo và la bàn hải trình thể hiện tinh thần đồng đội gắn kết."),
            new(
                "P10", "HS-PL-10",
                "Áo Polo Custom 10D1 Lớn Lên Cùng Nhau",
                "ao-polo-custom-10d1-lon-len-cung-nhau",
                "CAT_POLO", "B1", "Xanh Olive Nhạt", 122000m,
                "haushop/product/custom/ao-co-co-10",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476897/haushop/product/custom/ao-co-co-10.png",
                "Áo polo custom xanh olive dịu mắt phối cổ kem, họa tiết mầm non và cây xanh trưởng thành mang ý nghĩa đồng hành bền vững."),
            new(
                "P11", "HS-PL-11",
                "Áo Polo Custom 11D2 Gắn Kết Yêu Thương",
                "ao-polo-custom-11d2-gan-ket-yeu-thuong",
                "CAT_POLO", "B2", "Trắng Phối Navy", 142000m,
                "haushop/product/custom/ao-co-co-11",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476898/haushop/product/custom/ao-co-co-11.png",
                "Áo polo custom trắng tinh tế phối cổ navy, hình in tối giản trước ngực và thông điệp tình bạn gắn bó ở mặt lưng."),
            new(
                "P12", "HS-PL-12",
                "Áo Polo Custom 10E1 Chìa Khóa Thanh Xuân",
                "ao-polo-custom-10e1-chia-khoa-thanh-xuan",
                "CAT_POLO", "B1", "Xanh Cổ Vịt", 138000m,
                "haushop/product/custom/ao-co-co-12",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476899/haushop/product/custom/ao-co-co-12.png",
                "Áo polo custom xanh cổ vịt phối cổ kem, điểm nhấn thêu/in chìa khóa nhỏ trước ngực và lỗ khóa bầu trời đêm độc đáo mặt sau."),
            new(
                "P13", "HS-PL-13",
                "Áo Polo Custom 12D3 Cùng Ra Khơi",
                "ao-polo-custom-12d3-cung-ra-khoi",
                "CAT_POLO", "B2", "Xanh Biển Nhạt", 126000m,
                "haushop/product/custom/ao-co-co-13",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476900/haushop/product/custom/ao-co-co-13.png",
                "Áo polo custom xanh biển phối cổ trắng tươi mới, họa tiết thuyền giấy và cánh buồm ra khơi tùy chỉnh chữ theo yêu cầu."),
            new(
                "P14", "HS-PL-14",
                "Áo Polo Custom 11E2 Rạng Rỡ Như Nắng",
                "ao-polo-custom-11e2-rang-ro-nhu-nang",
                "CAT_POLO", "B1", "Vàng Mù Tạt", 146000m,
                "haushop/product/custom/ao-co-co-14",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476901/haushop/product/custom/ao-co-co-14.png",
                "Áo polo custom vàng mù tạt phối cổ navy nổi bật, nét vẽ line-art mặt trời và cổng trường tối giản dễ tùy biến tên lớp."),
            new(
                "P15", "HS-PL-15",
                "Áo Polo Custom 10F1 Nở Rộ Cùng Nhau",
                "ao-polo-custom-10f1-no-ro-cung-nhau",
                "CAT_POLO", "B1", "Hồng Pastel Phối Trắng", 150000m,
                "haushop/product/custom/ao-co-co-15",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476902/haushop/product/custom/ao-co-co-15.png",
                "Áo polo custom hồng pastel phối tay raglan trắng trẻ trung, họa tiết bó hoa line-art nhẹ nhàng dành cho nhóm, lớp yêu phong cách tinh tế."),

            // ── 12 Áo Cổ Tròn (T-Shirt Custom) ────────────────────────────────────
            new(
                "P16", "HS-TS-00",
                "Bộ Sưu Tập Áo Thun Cổ Tròn Custom A2 (8 Mẫu)",
                "bo-suu-tap-ao-thun-co-tron-custom-a2",
                "CAT_TSHIRT", "B1", "Đa Màu Custom", 129000m,
                "haushop/product/custom/ao-co-tron-coll",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476903/haushop/product/custom/ao-co-tron-coll.png",
                "Gói mẫu áo thun cổ tròn custom form oversize cotton 250gsm đa dạng 8 phối màu và chủ đề thiết kế sẵn, hỗ trợ tùy chỉnh chữ và logo theo nhóm."),
            new(
                "P17", "HS-TS-01",
                "Áo Thun Cổ Tròn Custom College Of HauShop 99",
                "ao-thun-co-tron-custom-college-of-haushop-99",
                "CAT_TSHIRT", "B2", "Xanh Rêu Đậm", 120000m,
                "haushop/product/custom/ao-co-tron-ts01",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476905/haushop/product/custom/ao-co-tron-ts01.png",
                "Áo thun cổ tròn custom xanh rêu đậm phong cách varsity college, cotton 100% co giãn thoải mái, in chuyển nhiệt bền màu trước sau."),
            new(
                "P18", "HS-TS-02",
                "Áo Thun Cổ Tròn Custom Dreamers A2 Thế Hệ Mới",
                "ao-thun-co-tron-custom-dreamers-a2-the-he-moi",
                "CAT_TSHIRT", "B2", "Xanh Rêu Xám", 135000m,
                "haushop/product/custom/ao-co-tron-ts02",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476907/haushop/product/custom/ao-co-tron-ts02.png",
                "Áo thun cổ tròn custom xanh rêu xám form rộng hiện đại, họa tiết máy bay giấy và thông điệp Thế Hệ Mới cá nhân hóa theo khóa lớp."),
            new(
                "P19", "HS-TS-03",
                "Áo Thun Cổ Tròn Custom Tuổi Trẻ Nổi Loạn We Are One",
                "ao-thun-co-tron-custom-tuoi-tre-noi-loan-we-are-one",
                "CAT_TSHIRT", "B2", "Đỏ Đô", 142000m,
                "haushop/product/custom/ao-co-tron-ts03",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476909/haushop/product/custom/ao-co-tron-ts03.png",
                "Áo thun cổ tròn custom đỏ đô typography nổi bật, họa tiết doodle học đường vui nhộn dễ thay đổi tên lớp và niên khóa."),
            new(
                "P20", "HS-TS-04",
                "Áo Thun Cổ Tròn Custom Thế Hệ Game On",
                "ao-thun-co-tron-custom-the-he-game-on",
                "CAT_TSHIRT", "B3", "Vàng Mù Tạt", 125000m,
                "haushop/product/custom/ao-co-tron-ts04",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476910/haushop/product/custom/ao-co-tron-ts04.png",
                "Áo thun cổ tròn custom vàng mù tạt phong cách pixel game retro, thích hợp cho team esport, câu lạc bộ và đồng phục lớp năng động."),
            new(
                "P21", "HS-TS-05",
                "Áo Thun Cổ Tròn Custom Chronicles Of 2027",
                "ao-thun-co-tron-custom-chronicles-of-2027",
                "CAT_TSHIRT", "B1", "Xanh Navy", 139000m,
                "haushop/product/custom/ao-co-tron-ts05",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476912/haushop/product/custom/ao-co-tron-ts05.png",
                "Áo thun cổ tròn custom xanh navy chủ đề dã ngoại lửa trại và hành trình tuổi trẻ, hỗ trợ in ấn logo tập thể sắc nét."),
            new(
                "P22", "HS-TS-06",
                "Áo Thun Cổ Tròn Custom The Future Lab Sáng Tạo",
                "ao-thun-co-tron-custom-the-future-lab-sang-tao",
                "CAT_TSHIRT", "B3", "Đen Chì", 149000m,
                "haushop/product/custom/ao-co-tron-ts06",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476914/haushop/product/custom/ao-co-tron-ts06.png",
                "Áo thun cổ tròn custom đen chì phong cách khoa học tương lai, phối cam xanh bắt mắt phù hợp khối chuyên, team tech và đồng phục nhóm."),
            new(
                "P23", "HS-TS-07",
                "Áo Thun Cổ Tròn Custom Spirit Of A2 Champions",
                "ao-thun-co-tron-custom-spirit-of-a2-champions",
                "CAT_TSHIRT", "B3", "Cam Đất", 132000m,
                "haushop/product/custom/ao-co-tron-ts07",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476915/haushop/product/custom/ao-co-tron-ts07.png",
                "Áo thun cổ tròn custom cam đất đậm chất thể thao học đường, họa tiết sư tử và huy hiệu Champions tùy chỉnh theo tên đội."),
            new(
                "P24", "HS-TS-08",
                "Áo Thun Cổ Tròn Custom Lưu Giữ Khoảnh Khắc Forever A2",
                "ao-thun-co-tron-custom-luu-giu-khoanh-khac-forever-a2",
                "CAT_TSHIRT", "B1", "Xanh Biển Khói", 128000m,
                "haushop/product/custom/ao-co-tron-ts08",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476916/haushop/product/custom/ao-co-tron-ts08.png",
                "Áo thun cổ tròn custom xanh biển khói trendy, họa tiết máy ảnh và cuộn phim lưu giữ kỷ niệm học trò có thể thay chữ tùy ý."),
            new(
                "P25", "HS-TS-09",
                "Áo Thun Cổ Tròn Custom Tuổi Trẻ Rực Rỡ Forever Young",
                "ao-thun-co-tron-custom-tuoi-tre-ruc-ro-forever-young",
                "CAT_TSHIRT", "B1", "Be Cát", 145000m,
                "haushop/product/custom/ao-co-tron-ts09",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476918/haushop/product/custom/ao-co-tron-ts09.png",
                "Áo thun cổ tròn custom màu be cát tối giản, typography phối xanh cam nổi bật thích hợp mặc hằng ngày và chụp kỷ yếu."),
            new(
                "P26", "HS-TS-10",
                "Áo Thun Cổ Tròn Custom Thế Hệ Game On Retro",
                "ao-thun-co-tron-custom-the-he-game-on-retro",
                "CAT_TSHIRT", "B3", "Be Cát", 148000m,
                "haushop/product/custom/ao-co-tron-ts10",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476919/haushop/product/custom/ao-co-tron-ts10.png",
                "Áo thun cổ tròn custom be cát họa tiết máy chơi game cầm tay retro và chữ pixel nổi bật, chất cotton dày dặn đứng form."),
            new(
                "P27", "HS-TS-11",
                "Áo Thun Cổ Tròn Custom Khoảnh Khắc Hoàng Hôn We Are One",
                "ao-thun-co-tron-custom-khoanh-khac-hoang-hon-we-are-one",
                "CAT_TSHIRT", "B2", "Be Cát", 136000m,
                "haushop/product/custom/ao-co-tron-ts11",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476921/haushop/product/custom/ao-co-tron-ts11.png",
                "Áo thun cổ tròn custom be cát phối mực in xanh rêu và cam đất ấm áp, thiết kế kỷ niệm tuổi học trò tùy chỉnh nội dung theo yêu cầu."),

            // ── 10 Áo Hoodie (Hoodie Custom) ───────────────────────────────────────
            new(
                "P28", "HS-HD-01",
                "Áo Hoodie Custom Champions Of A2 99",
                "ao-hoodie-custom-champions-of-a2-99",
                "CAT_HOODIE", "B3", "Xám Melange", 189000m,
                "haushop/product/custom/ao-hoodie-hd01",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476923/haushop/product/custom/ao-hoodie-hd01.png",
                "Áo hoodie custom nỉ bông 380gsm màu xám melange ấm áp, form boxy rộng rãi, in họa tiết linh vật và số áo lớp sắc nét."),
            new(
                "P29", "HS-HD-02",
                "Áo Hoodie Custom Thế Hệ Mới Dreamers A2",
                "ao-hoodie-custom-the-he-moi-dreamers-a2",
                "CAT_HOODIE", "B2", "Xanh Rêu Xám", 169000m,
                "haushop/product/custom/ao-hoodie-hd02",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476924/haushop/product/custom/ao-hoodie-hd02.png",
                "Áo hoodie custom xanh rêu xám mũ 2 lớp đứng form, họa tiết máy bay giấy và niên khóa mặt sau tùy biến theo tập thể."),
            new(
                "P30", "HS-HD-03",
                "Áo Hoodie Custom Tuổi Trẻ Nổi Loạn We Are One",
                "ao-hoodie-custom-tuoi-tre-noi-loan-we-are-one",
                "CAT_HOODIE", "B2", "Đỏ Đô", 175000m,
                "haushop/product/custom/ao-hoodie-hd03",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476925/haushop/product/custom/ao-hoodie-hd03.png",
                "Áo hoodie custom đỏ đô nổi bật, túi kangaroo tiện lợi, hình in học đường sinh động bền màu không bong tróc khi giặt."),
            new(
                "P31", "HS-HD-04",
                "Áo Hoodie Custom Thế Hệ Game On Level Up",
                "ao-hoodie-custom-the-he-game-on-level-up",
                "CAT_HOODIE", "B3", "Vàng Mù Tạt", 185000m,
                "haushop/product/custom/ao-hoodie-hd04",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476927/haushop/product/custom/ao-hoodie-hd04.png",
                "Áo hoodie custom vàng mù tạt phong cách pixel gaming cá tính, chất nỉ cotton dày mịn giữ ấm tốt cho mùa thu đông."),
            new(
                "P32", "HS-HD-05",
                "Áo Hoodie Custom Chronicles Of 2027",
                "ao-hoodie-custom-chronicles-of-2027",
                "CAT_HOODIE", "B1", "Xanh Navy", 195000m,
                "haushop/product/custom/ao-hoodie-hd05",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476928/haushop/product/custom/ao-hoodie-hd05.png",
                "Áo hoodie custom xanh navy họa tiết huy hiệu phiêu lưu trước ngực và lưng, phù hợp đồng phục lớp, CLB du lịch và sự kiện ngoài trời."),
            new(
                "P33", "HS-HD-06",
                "Áo Hoodie Custom The Future Lab Sáng Tạo",
                "ao-hoodie-custom-the-future-lab-sang-tao",
                "CAT_HOODIE", "B3", "Đen Chì", 199000m,
                "haushop/product/custom/ao-hoodie-hd06",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476930/haushop/product/custom/ao-hoodie-hd06.png",
                "Áo hoodie custom đen chì phong cách phòng thí nghiệm sáng tạo, phối chữ trắng cam hiện đại dễ tùy chỉnh tên nhóm."),
            new(
                "P34", "HS-HD-07",
                "Áo Hoodie Custom Spirit Of A2 Champions",
                "ao-hoodie-custom-spirit-of-a2-champions",
                "CAT_HOODIE", "B3", "Cam Đất", 179000m,
                "haushop/product/custom/ao-hoodie-hd07",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476931/haushop/product/custom/ao-hoodie-hd07.png",
                "Áo hoodie custom cam đất phong cách varsity thể thao, logo sư tử uy lực mặt sau tùy chỉnh tên đội và năm kỷ niệm."),
            new(
                "P35", "HS-HD-08",
                "Áo Hoodie Custom Lưu Giữ Khoảnh Khắc Forever A2",
                "ao-hoodie-custom-luu-giu-khoanh-khac-forever-a2",
                "CAT_HOODIE", "B1", "Xanh Biển Khói", 165000m,
                "haushop/product/custom/ao-hoodie-hd08",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476933/haushop/product/custom/ao-hoodie-hd08.png",
                "Áo hoodie custom xanh biển khói dịu mắt, thiết kế cuộn phim và máy ảnh lưu giữ ký ức tập thể cực hợp chụp ảnh nhóm."),
            new(
                "P36", "HS-HD-09",
                "Áo Hoodie Custom Tuổi Trẻ Rực Rỡ Forever Young",
                "ao-hoodie-custom-tuoi-tre-ruc-ro-forever-young",
                "CAT_HOODIE", "B1", "Be Cát", 159000m,
                "haushop/product/custom/ao-hoodie-hd09",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476935/haushop/product/custom/ao-hoodie-hd09.png",
                "Áo hoodie custom be cát nhẹ nhàng thanh lịch, font chữ cổ điển phối cam xanh dễ mặc cho cả nam và nữ."),
            new(
                "P37", "HS-HD-10",
                "Áo Hoodie Custom Bản Đồ Tình Bạn A2",
                "ao-hoodie-custom-ban-do-tinh-ban-a2",
                "CAT_HOODIE", "B2", "Xanh Forest Green", 192000m,
                "haushop/product/custom/ao-hoodie-hd10",
                "https://res.cloudinary.com/doj6srxwu/image/upload/v1794476936/haushop/product/custom/ao-hoodie-hd10.png",
                "Áo hoodie custom xanh forest green độc đáo, họa tiết sơ đồ lớp học kết nối trái tim mang dấu ấn kỷ niệm học trò sâu sắc."),
        };

        public static List<Category> Categories => new()
        {
            new() { Id = "CAT_CUSTOM", Name = "Áo Custom", Slug = "ao-custom", ParentId = null, IsActive = true },
            new() { Id = "CAT_POLO", Name = "Áo Có Cổ", Slug = "ao-co-co", ParentId = "CAT_CUSTOM", IsActive = true },
            new() { Id = "CAT_TSHIRT", Name = "Áo Cổ Tròn", Slug = "ao-co-tron", ParentId = "CAT_CUSTOM", IsActive = true },
            new() { Id = "CAT_HOODIE", Name = "Áo Hoodie", Slug = "ao-hoodie", ParentId = "CAT_CUSTOM", IsActive = true },
        };

        public static List<Brand> Brands => new()
        {
            new() { Id = "B1", Name = "HauShop Custom Studio", Slug = "haushop-custom-studio", Description = "Xưởng thiết kế và in áo lớp, áo nhóm, áo đồng phục theo yêu cầu.", IsActive = true },
            new() { Id = "B2", Name = "HauShop Class", Slug = "haushop-class", Description = "Bộ sưu tập áo lớp, áo kỷ niệm và đồng phục tập thể sáng tạo.", IsActive = true },
            new() { Id = "B3", Name = "HauShop Street Custom", Slug = "haushop-street-custom", Description = "Dòng áo thun và hoodie form rộng cá tính, tùy chỉnh họa tiết độc quyền.", IsActive = true },
        };

        public static List<Product> Products
        {
            get
            {
                var baseTime = DateTime.UtcNow.Date.AddDays(-7);
                var totalPerShirt = StandardSizes.Sum(x => x.Stock);

                return ShirtSpecs
                    .Select((spec, index) => new Product
                    {
                        Id = spec.Id,
                        Sku = spec.Sku,
                        Name = spec.Name,
                        Slug = spec.Slug,
                        ImageUrl = spec.ImageUrl,
                        ImageKey = spec.ImageKey,
                        Description = spec.Description,
                        Price = spec.Price,
                        Taxable = true,
                        IsActive = true,
                        BrandId = spec.BrandId,
                        Stock = totalPerShirt,
                        Created = baseTime.AddMinutes(index * 10),
                    })
                    .ToList();
            }
        }

        public static List<ProductCategory> ProductCategories => ShirtSpecs
            .Select(spec => new ProductCategory
            {
                ProductId = spec.Id,
                CategoryId = spec.CategoryId,
            })
            .ToList();

        public static List<ProductVariant> ProductVariants
        {
            get
            {
                var baseTime = DateTime.UtcNow.Date.AddDays(-7);

                return ShirtSpecs
                    .SelectMany((spec, index) => StandardSizes.Select(sizeSpec => new ProductVariant
                    {
                        Id = $"V{spec.Id[1..]}_{sizeSpec.Size}",
                        ProductId = spec.Id,
                        Size = sizeSpec.Size,
                        Color = spec.Color,
                        Sku = $"{spec.Sku}-{sizeSpec.Size}",
                        Price = spec.Price,
                        Stock = sizeSpec.Stock,
                        ImageUrl = spec.ImageUrl,
                        ImageKey = spec.ImageKey,
                        IsActive = true,
                        CreateAt = baseTime.AddMinutes(index * 10),
                    }))
                    .ToList();
            }
        }
    }
}
