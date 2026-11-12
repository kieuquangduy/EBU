import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "@iconify/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import type { ProductDto } from "../../@types/product.type";
import type {
  CreateQuoteRequestResultDto,
  LogoFileRefDto,
  PrintTechnique,
} from "../../@types/quoteRequest.type";
import { useToast } from "../../context/toastContext";
import { useAuth } from "../../hooks/useAuth";
import { useCreateQuoteRequest, useUploadQuoteLogos } from "../../hooks/useQuoteRequests";
import { PRINT_TECHNIQUE_OPTIONS } from "../../lib/quoteStatus";
import { routeTo } from "../../lib/routes";
import { resolveProductPricing } from "../../lib/productRfq";
import { formatPrice } from "../../utils/formatPrice";

const SIZES = ["S", "M", "L", "XL", "2XL", "3XL"] as const;
const MAX_LOGO_FILES = 5;
const MAX_LOGO_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_LOGO_EXT_REGEX = /\.(png|jpe?g|svg|pdf|ai)$/i;
const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;

const PRINT_TECHNIQUE_VALUES = [
  "ScreenPrint",
  "HeatTransfer",
  "DtfPrint",
  "Decal",
  "Embroidery",
  "Sublimation",
  "Other",
] as const;

interface QuoteRequestModalProps {
  open: boolean;
  onClose: () => void;
  product?: ProductDto | null;
  onSuccess?: (result: CreateQuoteRequestResultDto) => void;
}

type UploadedLogoItem = {
  ref: LogoFileRefDto;
  previewUrl: string | null;
};

function createQuoteSchema(minQty: number) {
  return z.object({
    customerName: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập họ tên.")
      .max(100, "Họ tên tối đa 100 ký tự."),
    phone: z
      .string()
      .trim()
      .regex(VN_PHONE_REGEX, "Số điện thoại Việt Nam không hợp lệ (VD: 0912345678)."),
    email: z
      .string()
      .trim()
      .refine((val) => !val || z.string().email().safeParse(val).success, "Email không hợp lệ.")
      .optional(),
    organizationName: z.string().trim().max(150, "Tên đơn vị tối đa 150 ký tự.").optional(),
    quantity: z
      .number({ message: "Vui lòng nhập số lượng." })
      .int("Số lượng phải là số nguyên.")
      .min(minQty, `Số lượng tối thiểu là ${minQty} áo.`)
      .max(100000, "Số lượng tối đa 100.000."),
    material: z.string().trim().max(100, "Chất liệu tối đa 100 ký tự.").optional(),
    printTechnique: z.enum(PRINT_TECHNIQUE_VALUES),
    colorSelection: z.string().trim().max(150, "Màu sắc tối đa 150 ký tự.").optional(),
    expectedDeliveryDate: z.string().optional(),
    note: z.string().trim().max(2000, "Ghi chú tối đa 2000 ký tự.").optional(),
    website: z.string().optional(),
  });
}

type QuoteFormValues = z.infer<ReturnType<typeof createQuoteSchema>>;

function normalizeInitialPrintTechnique(product?: ProductDto | null): PrintTechnique {
  const first = product?.availablePrintTechniques?.[0];
  if (!first) return "ScreenPrint";
  const found = PRINT_TECHNIQUE_VALUES.find((v) => v.toLowerCase() === first.toLowerCase());
  if (found) return found;
  const byLabel = PRINT_TECHNIQUE_OPTIONS.find(
    (opt) => opt.label.toLowerCase() === first.toLowerCase()
  );
  return byLabel?.value ?? "ScreenPrint";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function QuoteRequestModal({
  open,
  onClose,
  product,
  onSuccess,
}: QuoteRequestModalProps) {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const createQuoteMutation = useCreateQuoteRequest();
  const uploadLogosMutation = useUploadQuoteLogos();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const minQty = product?.minOrderQuantity && product.minOrderQuantity > 1 ? product.minOrderQuantity : 1;
  const schema = useMemo(() => createQuoteSchema(minQty), [minQty]);

  const [sizeBreakdown, setSizeBreakdown] = useState<Record<string, number>>(() =>
    Object.fromEntries(SIZES.map((s) => [s, 0]))
  );
  const [logos, setLogos] = useState<UploadedLogoItem[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [createdResult, setCreatedResult] = useState<CreateQuoteRequestResultDto | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName: "",
      phone: "",
      email: "",
      organizationName: "",
      quantity: minQty,
      material: product?.availableMaterials?.[0] ?? "",
      printTechnique: normalizeInitialPrintTechnique(product),
      colorSelection: "",
      expectedDeliveryDate: "",
      note: "",
      website: "",
    },
  });

  const sizeTotal = useMemo(
    () => Object.values(sizeBreakdown).reduce((sum, count) => sum + (Number.isFinite(count) ? count : 0), 0),
    [sizeBreakdown]
  );

  // Sync size matrix sum into quantity whenever user fills size counts
  useEffect(() => {
    if (sizeTotal > 0) {
      setValue("quantity", sizeTotal, { shouldValidate: true });
    }
  }, [sizeTotal, setValue]);

  // Reset modal form and revoke previews when opened for a product/user
  useEffect(() => {
    if (!open) return;

    const fullName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
    reset({
      customerName: fullName,
      phone: user?.phoneNumber ?? "",
      email: user?.email ?? "",
      organizationName: "",
      quantity: minQty,
      material: product?.availableMaterials?.[0] ?? "",
      printTechnique: normalizeInitialPrintTechnique(product),
      colorSelection: "",
      expectedDeliveryDate: "",
      note: "",
      website: "",
    });
    setSizeBreakdown(Object.fromEntries(SIZES.map((s) => [s, 0])));
    setUploadError(null);
    setSubmitError(null);
    setCreatedResult(null);
    setLogos((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
  }, [open, product, minQty, user, reset]);

  useEffect(() => {
    return () => {
      logos.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [logos]);

  if (!open) return null;

  const handleSizeChange = (size: string, raw: string) => {
    const parsed = Math.max(0, Math.min(100000, Math.floor(Number(raw) || 0)));
    setSizeBreakdown((prev) => ({ ...prev, [size]: parsed }));
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setUploadError(null);

    const incoming = Array.from(fileList);
    if (logos.length + incoming.length > MAX_LOGO_FILES) {
      setUploadError(`Chỉ hỗ trợ tối đa ${MAX_LOGO_FILES} file logo/thiết kế.`);
      return;
    }

    for (const file of incoming) {
      if (!ALLOWED_LOGO_EXT_REGEX.test(file.name)) {
        setUploadError(`File "${file.name}" không hợp lệ. Chỉ nhận PNG, JPG, SVG, PDF hoặc AI.`);
        return;
      }
      if (file.size > MAX_LOGO_SIZE_BYTES) {
        setUploadError(`File "${file.name}" vượt quá giới hạn 10MB.`);
        return;
      }
    }

    try {
      const uploadedRefs = await uploadLogosMutation.mutateAsync(incoming);
      const nextItems: UploadedLogoItem[] = uploadedRefs.map((ref, idx) => {
        const file = incoming[idx];
        const isImage =
          file && (file.type.startsWith("image/") || /\.(png|jpe?g|svg)$/i.test(file.name));
        return {
          ref,
          previewUrl: isImage ? URL.createObjectURL(file) : null,
        };
      });
      setLogos((prev) => [...prev, ...nextItems]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Không thể tải file logo lên.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeLogo = (fileName: string) => {
    setLogos((prev) => {
      const removed = prev.find((item) => item.ref.fileName === fileName);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((item) => item.ref.fileName !== fileName);
    });
  };

  const onSubmit = async (values: QuoteFormValues) => {
    setSubmitError(null);

    const activeSizes = Object.fromEntries(
      Object.entries(sizeBreakdown).filter(([, qty]) => qty > 0)
    );

    try {
      const result = await createQuoteMutation.mutateAsync({
        productId: product?.id ?? null,
        customerName: values.customerName,
        phone: values.phone,
        email: values.email || null,
        organizationName: values.organizationName || null,
        quantity: values.quantity,
        material: values.material || null,
        printTechnique: values.printTechnique,
        sizeBreakdown: Object.keys(activeSizes).length > 0 ? activeSizes : null,
        colorSelection: values.colorSelection || null,
        logoFiles: logos.length > 0 ? logos.map((l) => l.ref) : null,
        note: values.note || null,
        expectedDeliveryDate: values.expectedDeliveryDate
          ? new Date(`${values.expectedDeliveryDate}T00:00:00Z`).toISOString()
          : null,
        website: values.website || null,
      });

      setCreatedResult(result);
      showToast(`Đã gửi yêu cầu ${result.quoteCode}`, "success");
      onSuccess?.(result);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Gửi yêu cầu báo giá thất bại.");
    }
  };

  const copyQuoteCode = async () => {
    if (!createdResult) return;
    try {
      await navigator.clipboard.writeText(createdResult.quoteCode);
      showToast("Đã sao chép mã báo giá", "success");
    } catch {
      showToast("Không thể sao chép, vui lòng ghi lại mã trên màn hình", "info");
    }
  };

  const pricing = product ? resolveProductPricing(product) : null;
  const minDateString = new Date().toISOString().split("T")[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 sm:p-5 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">
              Request For Quotation
            </p>
            <h2 className="font-titleFont text-lg sm:text-xl font-bold text-primeColor">
              {createdResult ? "Đã tiếp nhận yêu cầu báo giá" : "Gửi yêu cầu báo giá áo Custom"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-black"
          >
            <Icon icon="mdi:close" width={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {createdResult ? (
            <div className="space-y-5 py-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Icon icon="mdi:check-circle-outline" width={34} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-primeColor">Yêu cầu đã được gửi thành công!</h3>
                <p className="text-sm text-lightText">
                  Đội ngũ tư vấn HauShop sẽ liên hệ lại với bạn trong thời gian sớm nhất.
                </p>
              </div>

              <div className="mx-auto max-w-md rounded-xl border border-blue-200 bg-[#eff6ff] p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Mã yêu cầu của bạn
                </p>
                <div className="mt-2 flex items-center justify-center gap-3">
                  <span className="font-mono text-xl font-bold text-[#1d4ed8]">
                    {createdResult.quoteCode}
                  </span>
                  <button
                    type="button"
                    onClick={copyQuoteCode}
                    className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#1d4ed8] hover:bg-blue-50"
                  >
                    <Icon icon="mdi:content-copy" width={14} />
                    Sao chép
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {isAuthenticated ? (
                  <Link
                    to={routeTo.quote(createdResult.id)}
                    onClick={onClose}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1d4ed8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e40af]"
                  >
                    Xem chi tiết báo giá
                  </Link>
                ) : (
                  <p className="w-full text-xs text-slate-500">
                    Mẹo: Đăng nhập trước khi gửi để theo dõi lịch sử & tiến độ báo giá trực tuyến.
                  </p>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-primeColor hover:bg-gray-50"
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : (
            <form id="rfq-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Hidden honeypot against bots */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
                {...register("website")}
              />

              {product && pricing && (
                <div className="flex items-center gap-4 rounded-xl border border-blue-100 bg-[#eff6ff] p-3.5">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-14 w-14 rounded-lg border border-white object-cover shadow-sm"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      Mẫu áo tham khảo
                    </p>
                    <p className="truncate font-semibold text-primeColor">{product.name}</p>
                    <p className="text-xs text-[#1d4ed8]">
                      Giá tham khảo từ {formatPrice(pricing.basePrice)} · Tối thiểu {minQty} áo
                    </p>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register("customerName")}
                    placeholder="Nguyễn Văn A"
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#1d4ed8]"
                  />
                  {errors.customerName && (
                    <p className="mt-1 text-xs text-red-600">{errors.customerName.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Số điện thoại / Zalo <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register("phone")}
                    placeholder="0912345678"
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#1d4ed8]"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    {...register("email")}
                    placeholder="email@congty.vn"
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#1d4ed8]"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Tên công ty / Lớp / Nhóm
                  </label>
                  <input
                    {...register("organizationName")}
                    placeholder="VD: CLB Truyền thông / Công ty ABC"
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#1d4ed8]"
                  />
                  {errors.organizationName && (
                    <p className="mt-1 text-xs text-red-600">{errors.organizationName.message}</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-slate-50/70 p-4">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Bảng chia size (tùy chọn)
                  </span>
                  <span className="text-xs text-slate-500">
                    {sizeTotal > 0
                      ? `Tổng từ size: ${sizeTotal} áo`
                      : "Bỏ trống nếu chưa chốt danh sách size"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
                  {SIZES.map((size) => (
                    <label
                      key={size}
                      className="flex flex-col rounded-lg border border-gray-200 bg-white px-2.5 py-2"
                    >
                      <span className="text-[11px] font-semibold text-slate-500">{size}</span>
                      <input
                        type="number"
                        min={0}
                        value={sizeBreakdown[size] || ""}
                        onChange={(e) => handleSizeChange(size, e.target.value)}
                        placeholder="0"
                        className="mt-1 w-full text-sm font-semibold text-primeColor outline-none"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Tổng số lượng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={minQty}
                    readOnly={sizeTotal > 0}
                    {...register("quantity", { valueAsNumber: true })}
                    className={`w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#1d4ed8] ${
                      sizeTotal > 0 ? "bg-slate-100 text-slate-700" : "bg-white"
                    }`}
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Chất liệu vải
                  </label>
                  {product?.availableMaterials && product.availableMaterials.length > 0 ? (
                    <select
                      {...register("material")}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#1d4ed8]"
                    >
                      {product.availableMaterials.map((mat) => (
                        <option key={mat} value={mat}>
                          {mat}
                        </option>
                      ))}
                      <option value="Tư vấn thêm">Cần tư vấn thêm</option>
                    </select>
                  ) : (
                    <input
                      {...register("material")}
                      placeholder="Cotton 100%, Cá sấu, Poly..."
                      className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#1d4ed8]"
                    />
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Kỹ thuật in / thêu <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register("printTechnique")}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#1d4ed8]"
                  >
                    {PRINT_TECHNIQUE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Màu sắc mong muốn
                  </label>
                  <input
                    {...register("colorSelection")}
                    placeholder="VD: Đen phối bo cổ trắng, Xanh navy..."
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#1d4ed8]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Ngày cần nhận hàng dự kiến
                  </label>
                  <input
                    type="date"
                    min={minDateString}
                    {...register("expectedDeliveryDate")}
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#1d4ed8]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  File logo / ý tưởng thiết kế (tối đa {MAX_LOGO_FILES} file, ≤ 10MB/file)
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    void handleFilesSelected(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-5 text-center transition ${
                    dragActive
                      ? "border-[#1d4ed8] bg-blue-50"
                      : "border-gray-300 bg-slate-50/50 hover:border-[#1d4ed8]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".png,.jpg,.jpeg,.svg,.pdf,.ai"
                    className="hidden"
                    onChange={(e) => void handleFilesSelected(e.target.files)}
                  />
                  <Icon
                    icon={uploadLogosMutation.isPending ? "mdi:loading" : "mdi:cloud-upload-outline"}
                    width={28}
                    className={`mx-auto text-[#1d4ed8] ${uploadLogosMutation.isPending ? "animate-spin" : ""}`}
                  />
                  <p className="mt-1.5 text-sm font-medium text-primeColor">
                    {uploadLogosMutation.isPending
                      ? "Đang tải file lên..."
                      : "Kéo thả hoặc nhấn chọn file logo (PNG, JPG, SVG, PDF, AI)"}
                  </p>
                </div>

                {uploadError && <p className="mt-1.5 text-xs text-red-600">{uploadError}</p>}

                {logos.length > 0 && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {logos.map(({ ref, previewUrl }) => (
                      <div
                        key={ref.fileName}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          {previewUrl ? (
                            <img
                              src={previewUrl}
                              alt={ref.originalName}
                              className="h-10 w-10 shrink-0 rounded object-cover border border-gray-100"
                            />
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-bold uppercase text-slate-600">
                              {ref.originalName.split(".").pop() ?? "FILE"}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-primeColor">
                              {ref.originalName}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {formatFileSize(ref.sizeBytes)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLogo(ref.fileName)}
                          aria-label="Xóa file"
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Icon icon="mdi:trash-can-outline" width={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Ghi chú vị trí in / yêu cầu thêm
                </label>
                <textarea
                  rows={3}
                  {...register("note")}
                  placeholder="VD: In logo trước ngực trái 8cm, sau lưng in slogan, cần xuất hóa đơn VAT..."
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#1d4ed8]"
                />
                {errors.note && <p className="mt-1 text-xs text-red-600">{errors.note.message}</p>}
              </div>

              {submitError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}
            </form>
          )}
        </div>

        {!createdResult && (
          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs text-slate-500">
              Miễn phí lên mockup thiết kế 2D trước khi chốt đơn sản xuất.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="rfq-form"
                disabled={isSubmitting || createQuoteMutation.isPending || uploadLogosMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1d4ed8] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:opacity-60"
              >
                <Icon
                  icon={createQuoteMutation.isPending ? "mdi:loading" : "lucide:send"}
                  width={16}
                  className={createQuoteMutation.isPending ? "animate-spin" : ""}
                />
                {createQuoteMutation.isPending ? "Đang gửi..." : "Gửi yêu cầu báo giá"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
