export type QuoteStatus =
  | "Pending"
  | "Contacted"
  | "Quoted"
  | "Accepted"
  | "InProduction"
  | "Completed"
  | "Rejected"
  | "Cancelled";

export type PrintTechnique =
  | "ScreenPrint"
  | "HeatTransfer"
  | "DtfPrint"
  | "Decal"
  | "Embroidery"
  | "Sublimation"
  | "Other";

export interface LogoFileRefDto {
  fileName: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
}

export interface CreateQuoteRequestDto {
  productId?: string | null;
  customerName: string;
  phone: string;
  email: string;
  organizationName?: string | null;
  quantity: number;
  material?: string | null;
  printTechnique?: PrintTechnique | null;
  sizeBreakdown?: Record<string, number> | null;
  colorSelection?: string | null;
  logoFiles?: LogoFileRefDto[] | null;
  note?: string | null;
  expectedDeliveryDate?: string | null;
  website?: string | null;
}

export interface CreateQuoteRequestResultDto {
  id: string;
  quoteCode: string;
  status: QuoteStatus;
  createdAt: string;
}

export interface QuoteRequestSummaryDto {
  id: string;
  quoteCode: string;
  productId?: string | null;
  productName?: string | null;
  productSlug?: string | null;
  productImageUrl?: string | null;
  userId?: string | null;
  customerName: string;
  phone: string;
  email?: string | null;
  organizationName?: string | null;
  quantity: number;
  material?: string | null;
  printTechnique: PrintTechnique;
  status: QuoteStatus;
  quotedPrice?: number | null;
  assignedAdminId?: string | null;
  assignedAdminName?: string | null;
  expectedDeliveryDate?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface QuoteRequestDto extends QuoteRequestSummaryDto {
  sizeBreakdown: Record<string, number>;
  colorSelection?: string | null;
  logoFiles: LogoFileRefDto[];
  note?: string | null;
  quotedNote?: string | null;
  internalNote?: string | null;
  quotedAt?: string | null;
}

export interface QuoteRequestFilterDto {
  status?: QuoteStatus | "";
  statusGroup?: "pending" | "accepted" | "completed" | "cancelled" | "";
  fromDate?: string;
  toDate?: string;
  assignedAdminId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedQuoteRequestDto {
  items: QuoteRequestSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UpdateQuoteStatusDto {
  status: QuoteStatus;
  internalNote?: string | null;
}

export interface UpdateQuotePriceDto {
  quotedPrice: number;
  quotedNote?: string | null;
  internalNote?: string | null;
  printTechnique?: PrintTechnique | null;
  expectedDeliveryDate?: string | null;
}

export interface AssignQuoteAdminDto {
  assignedAdminId?: string | null;
}

