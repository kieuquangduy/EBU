/**
 * FEATURE FLAGS CHO ĐÁNH GIÁ 2 VÒNG (ROUND 1 & ROUND 2)
 *
 * Kịch bản cải tiến (Fixes) cho đồ án E-Business - HANU:
 * - ROUND 1: Các tính năng F1, F2, F3 được đặt là `false` (tạm ẩn).
 *   Khảo sát khách hàng ghi nhận 3 vấn đề / nhu cầu:
 *     [F1] Khách hàng không thể đính kèm danh sách size cả lớp
 *     [F2] Khách hàng không theo dõi được tiến độ báo giá sau gửi
 *     [F3] Khách hàng muốn đăng nhập thêm bằng Google
 *
 * - ROUND 2: Khi cập nhật các Fixes cho Round 2, chỉ cần đổi các giá trị dưới đây thành `true`!
 */
export const FEATURE_FLAGS = {
  /**
   * F1: Đính kèm danh sách kích thước & bảng size (Excel, Word, PDF) khi gửi báo giá Custom
   * Round 1: false (Ẩn phần upload file size cả lớp)
   * Round 2: true (Hiện phần upload file size)
   */
  ENABLE_SIZE_DOC_UPLOAD: false,

  /**
   * F2: Theo dõi tiến độ báo giá sau gửi trực tuyến (Nút xem tiến độ trong modal & menu 'Yêu cầu báo giá của tôi')
   * Round 1: false (Khách chỉ nhận thông báo tư vấn viên sẽ liên hệ lại qua SĐT/Email, không có link xem tiến độ)
   * Round 2: true (Hiện nút xem chi tiết tiến độ báo giá & menu quản lý báo giá trực tuyến)
   */
  ENABLE_QUOTE_TRACKING: false,

  /**
   * F3: Đăng nhập / Đăng ký nhanh bằng Google OAuth
   * Round 1: false (Ẩn nút Đăng nhập bằng Google trên SignIn & SignUp)
   * Round 2: true (Hiện nút Google OAuth)
   */
  ENABLE_GOOGLE_AUTH: false,
} as const;
