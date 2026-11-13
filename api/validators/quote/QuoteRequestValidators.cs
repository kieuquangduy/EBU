using System.Text.RegularExpressions;
using FluentValidation;
using api.DTOs.quote;
using api.validators.shop;

namespace api.validators.quote
{
    public partial class CreateQuoteRequestDtoValidator : AbstractValidator<CreateQuoteRequestDto>
    {
        public CreateQuoteRequestDtoValidator()
        {
            RuleFor(x => x.Website)
                .Empty().WithMessage("Yêu cầu không hợp lệ.");

            RuleFor(x => x.ProductId)
                .MaximumLength(50).WithMessage("Mã sản phẩm tối đa 50 ký tự")
                .When(x => !string.IsNullOrWhiteSpace(x.ProductId));

            RuleFor(x => x.CustomerName)
                .NotEmpty().WithMessage("Vui lòng nhập họ tên khách hàng")
                .MaximumLength(150).WithMessage("Họ tên tối đa 150 ký tự");

            RuleFor(x => x.Phone)
                .NotEmpty().WithMessage("Vui lòng nhập số điện thoại")
                .Must(IsValidVnPhone).WithMessage("Số điện thoại Việt Nam không hợp lệ (vd: 0901234567 hoặc +84901234567)");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Vui lòng nhập email")
                .EmailAddress().WithMessage("Email không hợp lệ")
                .MaximumLength(200).WithMessage("Email tối đa 200 ký tự");

            RuleFor(x => x.OrganizationName)
                .MaximumLength(200).WithMessage("Tên CLB / lớp tối đa 200 ký tự")
                .When(x => !string.IsNullOrWhiteSpace(x.OrganizationName));

            RuleFor(x => x.Quantity)
                .GreaterThan(0).WithMessage("Số lượng phải lớn hơn 0")
                .LessThanOrEqualTo(100_000).WithMessage("Số lượng tối đa 100.000");

            RuleFor(x => x.Material)
                .MaximumLength(100).WithMessage("Chất liệu tối đa 100 ký tự")
                .When(x => !string.IsNullOrWhiteSpace(x.Material));

            RuleFor(x => x.PrintTechnique)
                .IsInEnum().WithMessage("Kỹ thuật in không hợp lệ")
                .When(x => x.PrintTechnique.HasValue);

            RuleFor(x => x.ColorSelection)
                .MaximumLength(100).WithMessage("Màu sắc tối đa 100 ký tự")
                .When(x => !string.IsNullOrWhiteSpace(x.ColorSelection));

            RuleFor(x => x.Note)
                .MaximumLength(2000).WithMessage("Ghi chú tối đa 2000 ký tự")
                .When(x => !string.IsNullOrWhiteSpace(x.Note));

            RuleFor(x => x.ExpectedDeliveryDate)
                .Must(date => date!.Value.Date >= DateTime.UtcNow.Date)
                .WithMessage("Ngày dự kiến nhận hàng không được ở quá khứ")
                .When(x => x.ExpectedDeliveryDate.HasValue);

            RuleFor(x => x.SizeBreakdown)
                .Must(HaveValidSizes)
                .WithMessage("Bảng size không hợp lệ (tối đa 20 size, số lượng mỗi size >= 0)")
                .When(x => x.SizeBreakdown is { Count: > 0 });

            RuleFor(x => x)
                .Must(x =>
                {
                    if (x.SizeBreakdown is not { Count: > 0 }) return true;
                    var sum = x.SizeBreakdown.Values.Sum();
                    return sum == 0 || sum == x.Quantity;
                })
                .WithName("SizeBreakdown")
                .WithMessage("Tổng số lượng theo bảng size phải khớp với tổng số lượng đặt");

            RuleFor(x => x.LogoFiles)
                .Must(files => files!.Count <= 10).WithMessage("Tối đa 10 file đính kèm")
                .Must(HaveValidLogoRefs).WithMessage("Tên file logo không hợp lệ")
                .When(x => x.LogoFiles is { Count: > 0 });
        }

        private static bool IsValidVnPhone(string? phone)
        {
            var normalized = UpdateShopContactDtoValidator.NormalizePhoneDigits(phone);
            return VnPhoneRegex().IsMatch(normalized);
        }

        private static bool HaveValidSizes(Dictionary<string, int>? breakdown)
        {
            if (breakdown is null || breakdown.Count > 20) return false;
            return breakdown.All(kvp =>
                !string.IsNullOrWhiteSpace(kvp.Key) &&
                kvp.Key.Trim().Length <= 20 &&
                kvp.Value is >= 0 and <= 100_000);
        }

        private static bool HaveValidLogoRefs(List<LogoFileRefDto>? refs)
        {
            if (refs is null) return true;
            return refs.All(item =>
                !string.IsNullOrWhiteSpace(item.FileName) &&
                SafeStoredFileNameRegex().IsMatch(item.FileName));
        }

        [GeneratedRegex(@"^(0|\+84)(3|5|7|8|9)[0-9]{8}$")]
        private static partial Regex VnPhoneRegex();

        [GeneratedRegex(@"^[a-f0-9]{32}\.(png|jpg|jpeg|svg|pdf|ai|xlsx|xls|docx|doc)$", RegexOptions.IgnoreCase)]
        private static partial Regex SafeStoredFileNameRegex();
    }

    public class UpdateQuoteStatusDtoValidator : AbstractValidator<UpdateQuoteStatusDto>
    {
        public UpdateQuoteStatusDtoValidator()
        {
            RuleFor(x => x.Status)
                .IsInEnum().WithMessage("Trạng thái báo giá không hợp lệ");

            RuleFor(x => x.InternalNote)
                .MaximumLength(1000).WithMessage("Ghi chú nội bộ tối đa 1000 ký tự")
                .When(x => !string.IsNullOrWhiteSpace(x.InternalNote));
        }
    }

    public class UpdateQuotePriceDtoValidator : AbstractValidator<UpdateQuotePriceDto>
    {
        public UpdateQuotePriceDtoValidator()
        {
            RuleFor(x => x.QuotedPrice)
                .GreaterThan(0).WithMessage("Giá báo phải lớn hơn 0")
                .LessThan(1_000_000_000m).WithMessage("Giá báo không hợp lệ");

            RuleFor(x => x.QuotedNote)
                .MaximumLength(1000).WithMessage("Ghi chú báo giá tối đa 1000 ký tự")
                .When(x => !string.IsNullOrWhiteSpace(x.QuotedNote));

            RuleFor(x => x.InternalNote)
                .MaximumLength(1000).WithMessage("Ghi chú nội bộ tối đa 1000 ký tự")
                .When(x => !string.IsNullOrWhiteSpace(x.InternalNote));

            RuleFor(x => x.PrintTechnique)
                .IsInEnum().WithMessage("Kỹ thuật in không hợp lệ")
                .When(x => x.PrintTechnique.HasValue);

            RuleFor(x => x.ExpectedDeliveryDate)
                .Must(date => date!.Value.Date >= DateTime.UtcNow.Date)
                .WithMessage("Ngày dự kiến giao hàng không được ở quá khứ")
                .When(x => x.ExpectedDeliveryDate.HasValue);
        }
    }
}

