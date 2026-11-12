using FluentValidation;
using api.DTOs.product;

namespace api.validators.product
{
    public class CreateProductValidator : AbstractValidator<CreateProductDto>
    {
        public CreateProductValidator()
        {
            RuleFor(x => x.Sku)
                .NotEmpty().WithMessage("SKU không được để trống")
                .MaximumLength(50).WithMessage("SKU tối đa 50 ký tự")
                .Matches(@"^[a-zA-Z0-9\-_]+$").WithMessage("SKU chỉ được chứa chữ, số, dấu - và _");

            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Tên sản phẩm không được để trống")
                .MaximumLength(200).WithMessage("Tên sản phẩm tối đa 200 ký tự");

            RuleFor(x => x.Description)
                .NotEmpty().WithMessage("Mô tả không được để trống")
                .MaximumLength(5000).WithMessage("Mô tả tối đa 5000 ký tự");

            RuleFor(x => x)
                .Must(x => (x.BasePrice ?? x.Price) > 0 && (x.BasePrice ?? x.Price) < 1_000_000_000)
                .WithName("Price")
                .WithMessage("Giá phải lớn hơn 0 và nhỏ hơn 1.000.000.000");

            RuleFor(x => x.OriginalPrice)
                .GreaterThanOrEqualTo(x => x.BasePrice ?? x.Price)
                .WithMessage("Giá gốc phải lớn hơn hoặc bằng giá từ")
                .When(x => x.OriginalPrice.HasValue);

            RuleFor(x => x.DiscountPercent)
                .InclusiveBetween(0, 99)
                .WithMessage("Phần trăm giảm giá phải từ 0 đến 99")
                .When(x => x.DiscountPercent.HasValue);

            RuleFor(x => x.PriceNote)
                .MaximumLength(500).WithMessage("Ghi chú giá tối đa 500 ký tự")
                .When(x => x.PriceNote != null);

            RuleFor(x => x.MinOrderQuantity)
                .InclusiveBetween(1, 100000).WithMessage("Số lượng tối thiểu phải từ 1 đến 100.000")
                .When(x => x.MinOrderQuantity.HasValue);

            RuleFor(x => x.AvailableMaterials)
                .Must(list => list!.Count <= 20).WithMessage("Tối đa 20 chất liệu gợi ý")
                .When(x => x.AvailableMaterials != null);

            RuleFor(x => x.AvailablePrintTechniques)
                .Must(list => list!.Count <= 20).WithMessage("Tối đa 20 kỹ thuật in gợi ý")
                .When(x => x.AvailablePrintTechniques != null);

            RuleFor(x => x.CategoryIds)
                .NotNull().WithMessage("CategoryIds không được null");
        }
    }

}