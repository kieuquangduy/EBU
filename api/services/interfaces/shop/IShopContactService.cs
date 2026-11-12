using api.DTOs.shop;

namespace api.services.interfaces.shop
{
    public interface IShopContactService
    {
        Task<ShopContactDto> GetAsync(CancellationToken ct = default);
        Task<ShopContactDto> UpdateAsync(UpdateShopContactDto dto, CancellationToken ct = default);
    }
}

