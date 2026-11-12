using api.data;
using api.DTOs.shop;
using api.models.entities;
using api.services.interfaces.caching;
using api.services.interfaces.shop;
using api.validators.shop;
using Microsoft.EntityFrameworkCore;

namespace api.services.implementations.shop
{
    public class ShopContactService : IShopContactService
    {
        private const string DefaultContactId = "default";
        private static readonly TimeSpan ContactCacheTtl = TimeSpan.FromHours(1);

        private readonly ApplicationDbContext _context;
        private readonly ICacheService _cache;

        public ShopContactService(ApplicationDbContext context, ICacheService cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<ShopContactDto> GetAsync(CancellationToken ct = default)
        {
            return await _cache.GetOrSetAsync(
                CacheKeys.ShopContact(),
                async token =>
                {
                    var entity = await _context.ShopContacts
                        .AsNoTracking()
                        .FirstOrDefaultAsync(x => x.Id == DefaultContactId, token);

                    if (entity is null)
                    {
                        entity = await CreateDefaultContactAsync(token);
                    }

                    return MapToDto(entity);
                },
                ContactCacheTtl,
                ct: ct);
        }

        public async Task<ShopContactDto> UpdateAsync(UpdateShopContactDto dto, CancellationToken ct = default)
        {
            var entity = await _context.ShopContacts
                .FirstOrDefaultAsync(x => x.Id == DefaultContactId, ct);

            if (entity is null)
            {
                entity = await CreateDefaultContactAsync(ct);
            }

            entity.ZaloPhone = NormalizeZaloPhone(dto.ZaloPhone);
            entity.ZaloOAId = string.IsNullOrWhiteSpace(dto.ZaloOAId) ? null : dto.ZaloOAId.Trim();
            entity.Hotline = dto.Hotline.Trim();
            entity.Email = dto.Email.Trim();
            entity.MessengerLink = string.IsNullOrWhiteSpace(dto.MessengerLink) ? null : dto.MessengerLink.Trim();
            entity.WorkingHours = string.IsNullOrWhiteSpace(dto.WorkingHours) ? null : dto.WorkingHours.Trim();
            entity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(ct);
            await _cache.RemoveAsync(CacheKeys.ShopContact(), ct);

            return MapToDto(entity);
        }

        private async Task<ShopContact> CreateDefaultContactAsync(CancellationToken ct)
        {
            var adminSettings = await _context.AdminSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == DefaultContactId, ct);

            var entity = new ShopContact
            {
                Id = DefaultContactId,
                ZaloPhone = NormalizeZaloPhone(adminSettings?.SupportPhone) is { Length: > 0 } phone
                    ? phone
                    : "0900000000",
                Hotline = string.IsNullOrWhiteSpace(adminSettings?.SupportPhone)
                    ? "0900 000 000"
                    : adminSettings.SupportPhone.Trim(),
                Email = string.IsNullOrWhiteSpace(adminSettings?.SupportEmail)
                    ? "contact@haushop.vn"
                    : adminSettings.SupportEmail.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _context.ShopContacts.Add(entity);
            await _context.SaveChangesAsync(ct);
            return entity;
        }

        public static string NormalizeZaloPhone(string? phone)
        {
            var digits = UpdateShopContactDtoValidator.NormalizePhoneDigits(phone);
            if (digits.StartsWith("+84", StringComparison.Ordinal))
            {
                return "0" + digits[3..];
            }

            return digits;
        }

        public static ShopContactDto MapToDto(ShopContact entity)
        {
            var normalizedZalo = NormalizeZaloPhone(entity.ZaloPhone);
            return new ShopContactDto
            {
                ZaloPhone = normalizedZalo,
                ZaloLink = string.IsNullOrEmpty(normalizedZalo)
                    ? string.Empty
                    : $"https://zalo.me/{normalizedZalo}",
                ZaloOAId = entity.ZaloOAId,
                Hotline = entity.Hotline,
                Email = entity.Email,
                MessengerLink = entity.MessengerLink,
                WorkingHours = entity.WorkingHours,
                UpdatedAt = entity.UpdatedAt ?? entity.CreatedAt
            };
        }
    }
}

