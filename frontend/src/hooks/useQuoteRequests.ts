import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type {
  CreateQuoteRequestDto,
  QuoteRequestFilterDto,
} from "../@types/quoteRequest.type";
import { useAuth } from "./useAuth";
import { queryKeys } from "../lib/queryKeys";
import { quoteRequestService } from "../services/quoteRequestService";

export function useMyQuotes(filters: QuoteRequestFilterDto) {
  const { isAuthenticated } = useAuth();
  const normalized = useMemo(
    () => ({
      status: filters.status || undefined,
      statusGroup: filters.statusGroup || undefined,
      search: filters.search?.trim() || undefined,
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 10,
    }),
    [filters.fromDate, filters.page, filters.pageSize, filters.search, filters.status, filters.statusGroup, filters.toDate]
  );

  return useQuery({
    queryKey: queryKeys.quotes.mine(normalized),
    queryFn: ({ signal }) => quoteRequestService.getMyQuotes(normalized, signal),
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useQuoteDetail(quoteId?: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.quotes.detail(quoteId ?? ""),
    queryFn: ({ signal }) => quoteRequestService.getQuoteById(quoteId!, signal),
    enabled: isAuthenticated && !!quoteId,
    staleTime: 30_000,
  });
}

export function useCreateQuoteRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateQuoteRequestDto) => quoteRequestService.createQuote(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.mineRoot });
      queryClient.invalidateQueries({ queryKey: ["admin", "quotes"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

export function useUploadQuoteLogos() {
  return useMutation({
    mutationFn: (files: File[]) => quoteRequestService.uploadLogos(files),
  });
}

export function useCancelQuoteRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quoteId: string) => quoteRequestService.cancelQuote(quoteId),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.quotes.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.quotes.mineRoot });
      queryClient.invalidateQueries({ queryKey: ["admin", "quotes"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

