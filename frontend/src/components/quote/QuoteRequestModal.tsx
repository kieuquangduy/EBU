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
} from "../../@types/quoteRequest.type";
import { useToast } from "../../context/toastContext";
import { useAuth } from "../../hooks/useAuth";
import { useCreateQuoteRequest, useUploadQuoteLogos } from "../../hooks/useQuoteRequests";
import { routeTo } from "../../lib/routes";
import { resolveProductPricing } from "../../lib/productRfq";
import { formatPrice } from "../../utils/formatPrice";

const MAX_FILES_PER_STREAM = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_DESIGN_EXT_REGEX = /\.(png|jpe?g|svg|webp|ai)$/i;
const ALLOWED_SIZE_DOC_EXT_REGEX = /\.(xlsx?|docx?|pdf)$/i;
const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;

interface QuoteRequestModalProps {
  open: boolean;
  onClose: () => void;
  product?: ProductDto | null;
  initialQuantity?: number;
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
      .min(1, "Vui lòng nhập email.")
      .email("Email không hợp lệ.")
      .max(200, "Email tối đa 200 ký tự."),
    organizationName: z.string().trim().max(150, "Tên đơn vị tối đa 150 ký tự.").optional(),
    quantity: z
      .number({ message: "Vui lòng nhập số lượng." })
      .int("Số lượng phải là số nguyên.")
      .min(minQty, `Số lượng tối thiểu là ${minQty} áo.`)
      .max(100000, "Số lượng tối đa 100.000."),
    colorSelection: z.string().trim().max(150, "Màu sắc tối đa 150 ký tự.").optional(),
    note: z.string().trim().max(2000, "Ghi chú tối đa 2000 ký tự.").optional(),
    website: z.string().optional(),
  });
}

type QuoteFormValues = z.infer<ReturnType<typeof createQuoteSchema>>;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileBadge(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "xlsx" || ext === "xls") {
    return {
      label: "EXCEL",
      bgClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: "mdi:file-excel-box",
    };
  }
  if (ext === "docx" || ext === "doc") {
    return {
      label: "WORD",
      bgClass: "bg-blue-50 text-blue-700 border-blue-200",
      icon: "mdi:file-word-box",
    };
  }
  if (ext === "pdf") {
    return {
      label: "PDF",
      bgClass: "bg-red-50 text-red-700 border-red-200",
      icon: "mdi:file-pdf-box",
    };
  }
  if (ext === "ai") {
    return {
      label: "AI",
      bgClass: "bg-amber-50 text-amber-800 border-amber-200",
      icon: "mdi:vector-bezier",
    };
  }
  return {
    label: ext.toUpperCase() || "FILE",
    bgClass: "bg-slate-50 text-slate-700 border-slate-200",
    icon: "mdi:file-document-outline",
  };
}

export default function QuoteRequestModal({
  open,
  onClose,
  product,
  initialQuantity,
  onSuccess,
}: QuoteRequestModalProps) {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const createQuoteMutation = useCreateQuoteRequest();
  const uploadLogosMutation = useUploadQuoteLogos();

  const designInputRef = useRef<HTMLInputElement>(null);
  const sizeDocInputRef = useRef<HTMLInputElement>(null);

  const minQty = product?.minOrderQuantity && product.minOrderQuantity > 1 ? product.minOrderQuantity : 1;
  const startingQty =
    initialQuantity && initialQuantity > 0 ? Math.max(minQty, initialQuantity) : minQty;
  const schema = useMemo(() => createQuoteSchema(minQty), [minQty]);

  // Luồng 1: Upload ảnh logo / mockup custom
  const [designFiles, setDesignFiles] = useState<UploadedLogoItem[]>([]);
  const [designError, setDesignError] = useState<string | null>(null);
  const [dragActiveDesign, setDragActiveDesign] = useState(false);

  // Luồng 2: Upload file kích thước & size áo (Word / Excel / PDF)
  const [sizeFiles, setSizeFiles] = useState<UploadedLogoItem[]>([]);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [dragActiveSize, setDragActiveSize] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<CreateQuoteRequestResultDto | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName: "",
      phone: "",
      email: "",
      organizationName: "",
      quantity: startingQty,
      colorSelection: "",
      note: "",
      website: "",
    },
  });

  // Reset form state when opened
  useEffect(() => {
    if (!open) return;

    const fullName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
    reset({
      customerName: fullName,
      phone: user?.phoneNumber ?? "",
      email: user?.email ?? "",
      organizationName: "",
      quantity: startingQty,
      colorSelection: "",
      note: "",
      website: "",
    });
    setDesignError(null);
    setSizeError(null);
    setSubmitError(null);
    setCreatedResult(null);

    setDesignFiles((prev) => {
      prev.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
    setSizeFiles([]);
  }, [open, product, minQty, user, reset, startingQty]);

  useEffect(() => {
    return () => {
      designFiles.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [designFiles]);

  if (!open) return null;

  // Xử lý upload ảnh logo / mockup custom
  const handleDesignFilesSelected = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setDesignError(null);

    const incoming = Array.from(fileList);
    if (designFiles.length + incoming.length > MAX_FILES_PER_STREAM) {
      setDesignError(`Chỉ hỗ trợ tối đa ${MAX_FILES_PER_STREAM} ảnh thiết kế/logo.`);
      return;
    }

    for (const file of incoming) {
      if (!ALLOWED_DESIGN_EXT_REGEX.test(file.name)) {
        setDesignError(`File "${file.name}" không hợp lệ. Chỉ nhận ảnh (PNG, JPG, JPEG, SVG, WebP, AI).`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setDesignError(`File "${file.name}" vượt quá giới hạn 10MB.`);
        return;
      }
    }

    try {
      const uploadedRefs = await uploadLogosMutation.mutateAsync(incoming);
      const nextItems: UploadedLogoItem[] = uploadedRefs.map((ref, idx) => {
        const file = incoming[idx];
        const isImage = file && (file.type.startsWith("image/") || /\.(png|jpe?g|svg|webp)$/i.test(file.name));
        return {
          ref,
          previewUrl: isImage ? URL.createObjectURL(file) : null,
        };
      });
      setDesignFiles((prev) => [...prev, ...nextItems]);
    } catch (err) {
      setDesignError(err instanceof Error ? err.message : "Không thể tải ảnh thiết kế lên.");
    } finally {
      if (designInputRef.current) {
        designInputRef.current.value = "";
      }
    }
  };

  // Xử lý upload file kích thước áo (Word / Excel / PDF)
  const handleSizeFilesSelected = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setSizeError(null);

    const incoming = Array.from(fileList);
    if (sizeFiles.length + incoming.length > MAX_FILES_PER_STREAM) {
      setSizeError(`Chỉ hỗ trợ tối đa ${MAX_FILES_PER_STREAM} file danh sách size.`);
      return;
    }

    for (const file of incoming) {
      if (!ALLOWED_SIZE_DOC_EXT_REGEX.test(file.name)) {
        setSizeError(`File "${file.name}" không hợp lệ. Vui lòng chọn file Word (.docx, .doc), Excel (.xlsx, .xls) hoặc PDF.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setSizeError(`File "${file.name}" vượt quá giới hạn 10MB.`);
        return;
      }
    }

    try {
      const uploadedRefs = await uploadLogosMutation.mutateAsync(incoming);
      const nextItems: UploadedLogoItem[] = uploadedRefs.map((ref) => ({
        ref,
        previewUrl: null,
      }));
      setSizeFiles((prev) => [...prev, ...nextItems]);
    } catch (err) {
      setSizeError(err instanceof Error ? err.message : "Không thể tải file kích thước lên.");
    } finally {
      if (sizeDocInputRef.current) {
        sizeDocInputRef.current.value = "";
      }
    }
  };

  const removeDesignFile = (fileName: string) => {
    setDesignFiles((prev) => {
      const removed = prev.find((item) => item.ref.fileName === fileName);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((item) => item.ref.fileName !== fileName);
    });
  };

  const removeSizeFile = (fileName: string) => {
    setSizeFiles((prev) => prev.filter((item) => item.ref.fileName !== fileName));
  };

  const onSubmit = async (values: QuoteFormValues) => {
    setSubmitError(null);

    const combinedLogoFiles = [
      ...designFiles.map((d) => d.ref),
      ...sizeFiles.map((s) => s.ref),
    ];

    try {
      const result = await createQuoteMutation.mutateAsync({
        productId: product?.id ?? null,
        customerName: values.customerName.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        organizationName: values.organizationName?.trim() || null,
        quantity: Number(values.quantity),
        material: null,
        printTechnique: undefined,
        sizeBreakdown: null,
        colorSelection: values.colorSelection?.trim() || null,
        logoFiles: combinedLogoFiles.length > 0 ? combinedLogoFiles : null,
        note: values.note?.trim() || null,
        expectedDeliveryDate: null,
        website: values.website?.trim() || null,
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-md bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-6 bg-white">
          <h2 className="font-titleFont text-lg sm:text-xl font-bold text-primeColor">
            {createdResult ? "Đã tiếp nhận yêu cầu báo giá" : "Gửi yêu cầu báo giá áo Custom"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-black"
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

              <div className="mx-auto max-w-md rounded-md border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Mã yêu cầu của bạn
                </p>
                <div className="mt-2 flex items-center justify-center gap-3">
                  <span className="font-mono text-xl font-bold text-primeColor">
                    {createdResult.quoteCode}
                  </span>
                  <button
                    type="button"
                    onClick={copyQuoteCode}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-primeColor hover:bg-gray-100"
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
                    className="inline-flex items-center gap-2 rounded-md bg-primeColor px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition"
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
                  className="rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-primeColor hover:bg-gray-50"
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : (
            <form id="rfq-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                <div className="flex items-center gap-4 rounded-md border border-gray-200 bg-gray-50 p-3.5">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-14 w-14 rounded-md border border-gray-200 object-cover shadow-xs"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      Mẫu áo tham khảo
                    </p>
                    <p className="truncate font-semibold text-primeColor">{product.name}</p>
                    <p className="text-xs font-semibold text-red-500">
                      Giá tham khảo từ {formatPrice(pricing.basePrice)} · Tối thiểu {minQty} áo
                    </p>
                  </div>
                </div>
              )}

              {/* Form grid 2 cột đều cho 6 trường thông tin cơ bản */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register("customerName")}
                    placeholder="Nguyễn Văn A"
                    className="w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-primeColor focus:ring-1 focus:ring-primeColor"
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
                    className="w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-primeColor focus:ring-1 focus:ring-primeColor"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    {...register("email")}
                    placeholder="email@congty.vn"
                    className="w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-primeColor focus:ring-1 focus:ring-primeColor"
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
                    className="w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-primeColor focus:ring-1 focus:ring-primeColor"
                  />
                  {errors.organizationName && (
                    <p className="mt-1 text-xs text-red-600">{errors.organizationName.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Tổng số lượng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={minQty}
                    {...register("quantity", { valueAsNumber: true })}
                    className="w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-primeColor focus:ring-1 focus:ring-primeColor bg-white"
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Màu sắc mong muốn
                  </label>
                  <input
                    {...register("colorSelection")}
                    placeholder="VD: Đen phối bo cổ trắng, Xanh navy..."
                    className="w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-primeColor focus:ring-1 focus:ring-primeColor"
                  />
                </div>
              </div>

              {/* Phần ghi chú - Hàng ngang full-width (không grid col) */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Ghi chú vị trí in &amp; yêu cầu riêng
                </label>
                <textarea
                  rows={2}
                  {...register("note")}
                  placeholder="VD: In logo trước ngực trái 8cm, sau lưng in slogan, đóng gói túi zip riêng từng áo, xuất hóa đơn VAT..."
                  className="w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-primeColor focus:ring-1 focus:ring-primeColor"
                />
                {errors.note && <p className="mt-1 text-xs text-red-600">{errors.note.message}</p>}
              </div>

              {/* Phần 1: Tải ảnh logo / Mẫu áo thiết kế custom - Hàng ngang full-width */}
              <div className="rounded-md border border-gray-200 bg-gray-50/60 p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon icon="mdi:image-outline" className="text-primeColor" width={18} />
                    <label className="text-xs font-bold text-primeColor">
                      Ảnh Logo / Mẫu áo thiết kế custom
                    </label>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {designFiles.length}/{MAX_FILES_PER_STREAM} ảnh · PNG, JPG, JPEG, SVG, WebP, AI (≤ 10MB)
                  </span>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActiveDesign(true);
                  }}
                  onDragLeave={() => setDragActiveDesign(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActiveDesign(false);
                    void handleDesignFilesSelected(e.dataTransfer.files);
                  }}
                  onClick={() => designInputRef.current?.click()}
                  className={`flex cursor-pointer items-center justify-center gap-2.5 rounded-md border-2 border-dashed px-4 py-3 text-center transition ${
                    dragActiveDesign
                      ? "border-primeColor bg-gray-100"
                      : "border-gray-300 bg-white hover:border-primeColor hover:bg-gray-50"
                  }`}
                >
                  <input
                    ref={designInputRef}
                    type="file"
                    multiple
                    accept=".png,.jpg,.jpeg,.svg,.webp,.ai"
                    className="hidden"
                    onChange={(e) => void handleDesignFilesSelected(e.target.files)}
                  />
                  <Icon
                    icon={uploadLogosMutation.isPending ? "mdi:loading" : "mdi:cloud-upload-outline"}
                    width={20}
                    className={`text-primeColor ${uploadLogosMutation.isPending ? "animate-spin" : ""}`}
                  />
                  <p className="text-xs font-medium text-primeColor">
                    Kéo thả hoặc nhấn để chọn tải ảnh logo / mẫu áo thiết kế
                  </p>
                </div>

                {designError && <p className="mt-1.5 text-xs text-red-600">{designError}</p>}

                {designFiles.length > 0 && (
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {designFiles.map(({ ref, previewUrl }) => {
                      const badge = getFileBadge(ref.originalName);
                      return (
                        <div
                          key={ref.fileName}
                          className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 shadow-xs"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            {previewUrl ? (
                              <img
                                src={previewUrl}
                                alt={ref.originalName}
                                className="h-9 w-9 shrink-0 rounded object-cover border border-gray-100"
                              />
                            ) : (
                              <span
                                className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded border text-[9px] font-bold ${badge.bgClass}`}
                              >
                                <Icon icon={badge.icon} width={18} />
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-primeColor">
                                {ref.originalName}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {formatFileSize(ref.sizeBytes)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDesignFile(ref.fileName)}
                            aria-label="Xóa ảnh"
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                          >
                            <Icon icon="mdi:trash-can-outline" width={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Phần 2: File danh sách kích thước & bảng size - Hàng ngang full-width */}
              <div className="rounded-md border border-gray-200 bg-gray-50/60 p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon icon="mdi:file-table-box-outline" className="text-primeColor" width={18} />
                    <label className="text-xs font-bold text-primeColor">
                      File kích thước &amp; Bảng size (Word, Excel, PDF)
                    </label>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {sizeFiles.length}/{MAX_FILES_PER_STREAM} file · .xlsx, .xls, .docx, .doc, .pdf (≤ 10MB)
                  </span>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActiveSize(true);
                  }}
                  onDragLeave={() => setDragActiveSize(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActiveSize(false);
                    void handleSizeFilesSelected(e.dataTransfer.files);
                  }}
                  onClick={() => sizeDocInputRef.current?.click()}
                  className={`flex cursor-pointer items-center justify-center gap-2.5 rounded-md border-2 border-dashed px-4 py-3 text-center transition ${
                    dragActiveSize
                      ? "border-primeColor bg-gray-100"
                      : "border-gray-300 bg-white hover:border-primeColor hover:bg-gray-50"
                  }`}
                >
                  <input
                    ref={sizeDocInputRef}
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.docx,.doc,.pdf"
                    className="hidden"
                    onChange={(e) => void handleSizeFilesSelected(e.target.files)}
                  />
                  <Icon
                    icon={uploadLogosMutation.isPending ? "mdi:loading" : "mdi:file-upload-outline"}
                    width={20}
                    className={`text-primeColor ${uploadLogosMutation.isPending ? "animate-spin" : ""}`}
                  />
                  <p className="text-xs font-medium text-primeColor">
                    Kéo thả hoặc nhấn để chọn file Excel bảng size hoặc Word mô tả kích thước
                  </p>
                </div>

                {sizeError && <p className="mt-1.5 text-xs text-red-600">{sizeError}</p>}

                {sizeFiles.length > 0 && (
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {sizeFiles.map(({ ref }) => {
                      const badge = getFileBadge(ref.originalName);
                      return (
                        <div
                          key={ref.fileName}
                          className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 shadow-xs"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded border text-[9px] font-bold ${badge.bgClass}`}
                            >
                              <Icon icon={badge.icon} width={18} />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-primeColor">
                                {ref.originalName}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {formatFileSize(ref.sizeBytes)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSizeFile(ref.fileName)}
                            aria-label="Xóa file"
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                          >
                            <Icon icon="mdi:trash-can-outline" width={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {submitError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}
            </form>
          )}
        </div>

        {!createdResult && (
          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-gray-50/90 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs text-slate-500">
              Miễn phí lên mockup thiết kế 2D trước khi chốt đơn sản xuất.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-gray-100 transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="rfq-form"
                disabled={isSubmitting || createQuoteMutation.isPending || uploadLogosMutation.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-primeColor px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Icon
                  icon={createQuoteMutation.isPending ? "mdi:loading" : "lucide:send"}
                  width={15}
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
