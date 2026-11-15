import api from "../api/apiClient";
import { http } from "../lib/http";
import type {
  CreateQuoteRequestDto,
  CreateQuoteRequestResultDto,
  LogoFileRefDto,
  PagedQuoteRequestDto,
  QuoteRequestDto,
  QuoteRequestFilterDto,
} from "../@types/quoteRequest.type";

export const quoteRequestService = {
  createQuote(dto: CreateQuoteRequestDto): Promise<CreateQuoteRequestResultDto> {
    return http.post<CreateQuoteRequestResultDto>("/quote-requests", dto);
  },

  uploadLogos(files: File[]): Promise<LogoFileRefDto[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file, file.name);
    });
    return http.post<LogoFileRefDto[]>("/quote-requests/logos", formData);
  },

  getMyQuotes(
    filters: QuoteRequestFilterDto = {},
    signal?: AbortSignal
  ): Promise<PagedQuoteRequestDto> {
    return http.get<PagedQuoteRequestDto>("/quote-requests/me", {
      params: filters,
      signal,
    });
  },

  getQuoteById(id: string, signal?: AbortSignal): Promise<QuoteRequestDto> {
    return http.get<QuoteRequestDto>(`/quote-requests/${encodeURIComponent(id)}`, { signal });
  },

  cancelQuote(id: string): Promise<QuoteRequestDto> {
    return http.patch<QuoteRequestDto>(`/quote-requests/${encodeURIComponent(id)}/cancel`);
  },

  acceptQuote(id: string): Promise<QuoteRequestDto> {
    return http.patch<QuoteRequestDto>(`/quote-requests/${encodeURIComponent(id)}/accept`);
  },

  async getLogoBlob(quoteId: string, fileName: string): Promise<Blob> {
    const response = await api.get<Blob>(
      `/quote-requests/${encodeURIComponent(quoteId)}/logos/${encodeURIComponent(fileName)}`,
      { responseType: "blob" }
    );
    return response.data;
  },

  async downloadLogo(quoteId: string, fileName: string, originalName?: string): Promise<void> {
    const blobUrl = URL.createObjectURL(await this.getLogoBlob(quoteId, fileName));
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = originalName || fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  },
};

