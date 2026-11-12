import { useQuery } from "@tanstack/react-query";
import { cachePolicy } from "../lib/cachePolicy";
import { queryKeys } from "../lib/queryKeys";
import { shopContactService } from "../services/shopContactService";

export function useShopContact() {
  return useQuery({
    queryKey: queryKeys.shopContact.public,
    queryFn: ({ signal }) => shopContactService.getPublic(signal),
    ...cachePolicy.shopContact,
    retry: 1,
  });
}

