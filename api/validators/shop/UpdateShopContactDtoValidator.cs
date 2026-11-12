using System.Text.RegularExpressions;
using FluentValidation;
using api.DTOs.shop;

namespace api.validators.shop
{
    public partial class UpdateShopContactDtoValidator : AbstractValidator<UpdateShopContactDto>
    {
        public UpdateShopContactDtoValidator()
        {
            RuleFor(x => x.ZaloPhone)
                .NotEmpty().WithMessage("Số Zalo không được để trống")
                .Must(IsValidVnMobilePhone)
                .WithMessage("Số Zalo phải là số điện thoại di động Việt Nam hợp lệ (vd: 0901234567 hoặc +84901234567)");

            RuleFor(x => x.ZaloOAId)
                .MaximumLength(100).WithMessage("Zalo OA ID tối đa 100 ký tự")
                .When(x => !string.IsNullOrWhiteSpace(x.ZaloOAId));

            RuleFor(x => x.Hotline)
                .NotEmpty().WithMessage("Hotline không được để trống")
                .MaximumLength(30).WithMessage("Hotline tối đa 30 ký tự")
                .Matches(@"^[0-9+\-.\s()]{6,30}$").WithMessage("Hotline không hợp lệ");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email liên hệ không được để trống")
                .EmailAddress().WithMessage("Email liên hệ không hợp lệ")
                .MaximumLength(200).WithMessage("Email liên hệ tối đa 200 ký tự");

            RuleFor(x => x.MessengerLink)
                .MaximumLength(500).WithMessage("Link Messenger tối đa 500 ký tự")
                .Must(BeValidHttpUrl).WithMessage("Link Messenger phải bắt đầu bằng https:// hoặc http://")
                .When(x => !string.IsNullOrWhiteSpace(x.MessengerLink));

            RuleFor(x => x.WorkingHours)
                .MaximumLength(200).WithMessage("Giờ làm việc tối đa 200 ký tự")
                .When(x => !string.IsNullOrWhiteSpace(x.WorkingHours));
        }

        public static string NormalizePhoneDigits(string? input) =>
            string.IsNullOrWhiteSpace(input) ? string.Empty : NonPhoneSeparatorsRegex().Replace(input.Trim(), string.Empty);

        private static bool IsValidVnMobilePhone(string? phone)
        {
            var normalized = NormalizePhoneDigits(phone);
            return VnMobileRegex().IsMatch(normalized);
        }

        private static bool BeValidHttpUrl(string? url)
        {
            if (string.IsNullOrWhiteSpace(url)) return true;
            return Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri)
                && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp);
        }

        [GeneratedRegex(@"[\s.\-()]")]
        private static partial Regex NonPhoneSeparatorsRegex();

        [GeneratedRegex(@"^(0|\+84)(3|5|7|8|9)[0-9]{8}$")]
        private static partial Regex VnMobileRegex();
    }
}

