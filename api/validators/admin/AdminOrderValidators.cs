using api.DTOs.admin;
using FluentValidation;

namespace api.validators.admin;

public sealed class AdminCreateOrderFromQuoteDtoValidator : AbstractValidator<AdminCreateOrderFromQuoteDto>
{
    public AdminCreateOrderFromQuoteDtoValidator()
    {
        RuleFor(x => x.ReceiverName)
            .MaximumLength(200)
            .When(x => !string.IsNullOrWhiteSpace(x.ReceiverName));

        RuleFor(x => x.ReceiverPhone)
            .Matches(@"^(0|\+84)(3|5|7|8|9)[0-9]{8}$")
            .WithMessage("Số điện thoại Việt Nam không hợp lệ.")
            .When(x => !string.IsNullOrWhiteSpace(x.ReceiverPhone));

        RuleFor(x => x.AddressLine)
            .NotEmpty().WithMessage("Vui lòng nhập địa chỉ giao hàng.")
            .MaximumLength(500);

        RuleFor(x => x.Subtotal)
            .GreaterThan(0).WithMessage("Giá trị đơn hàng phải lớn hơn 0.")
            .When(x => x.Subtotal.HasValue);

        RuleFor(x => x.ShippingFee)
            .GreaterThanOrEqualTo(0);

        RuleFor(x => x.Note)
            .MaximumLength(1000)
            .When(x => !string.IsNullOrWhiteSpace(x.Note));
    }
}

public sealed class AdminCreateManualOrderDtoValidator : AbstractValidator<AdminCreateManualOrderDto>
{
    public AdminCreateManualOrderDtoValidator()
    {
        RuleFor(x => x.ReceiverName)
            .NotEmpty().WithMessage("Vui lòng nhập tên khách hàng.")
            .MaximumLength(200);

        RuleFor(x => x.ReceiverPhone)
            .NotEmpty().WithMessage("Vui lòng nhập số điện thoại.")
            .MaximumLength(20)
            .Matches(@"^(0|\+84)(3|5|7|8|9)[0-9]{8}$")
            .WithMessage("Số điện thoại Việt Nam không hợp lệ.");

        RuleFor(x => x.AddressLine)
            .NotEmpty().WithMessage("Vui lòng nhập địa chỉ giao hàng.")
            .MaximumLength(500);

        RuleFor(x => x.ShippingFee)
            .GreaterThanOrEqualTo(0);

        RuleFor(x => x.Note)
            .MaximumLength(1000)
            .When(x => !string.IsNullOrWhiteSpace(x.Note));

        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("Đơn hàng cần ít nhất 1 sản phẩm.");

        RuleForEach(x => x.Items)
            .ChildRules(item =>
            {
                item.RuleFor(i => i.ProductName)
                    .NotEmpty().WithMessage("Tên sản phẩm không được để trống.")
                    .MaximumLength(300);

                item.RuleFor(i => i.Quantity)
                    .GreaterThan(0).WithMessage("Số lượng phải lớn hơn 0.");

                item.RuleFor(i => i.UnitPrice)
                    .GreaterThanOrEqualTo(0).WithMessage("Đơn giá không hợp lệ.");
            });
    }
}

