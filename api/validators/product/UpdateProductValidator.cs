using FluentValidation;
using api.DTOs.product;

namespace api.validators.product
{
    public class UpdateProductValidator : AbstractValidator<UpdateProductDto>
    {
        public UpdateProductValidator()
        {
            RuleFor(x => x.Sku)
                .MaximumLength(50).WithMessage("SKU tối đa 50 ký tự")
                .Matches(@"^[a-zA-Z0-9\-_]+$").WithMessage("SKU chỉ được chứa chữ, số, dấu - và _")
                .When(x => x.Sku != null);

            RuleFor(x => x.Name)
                .MaximumLength(200).WithMessage("Tên sản phẩm tối đa 200 ký tự")
                .When(x => x.Name != null);

            RuleFor(x => x.Description)
                .MaximumLength(5000).WithMessage("Mô tả tối đa 5000 ký tự")
                .When(x => x.Description != null);

            RuleFor(x => x.Price)
                .GreaterThan(0).WithMessage("Giá phải lớn hơn 0")
                .LessThan(1_000_000_000).WithMessage("Giá không hợp lệ")
                .When(x => x.Price.HasValue);

            RuleFor(x => x.BasePrice)
                .GreaterThan(0).WithMessage("Giá từ phải lớn hơn 0")
                .LessThan(1_000_000_000).WithMessage("Giá từ không hợp lệ")
                .When(x => x.BasePrice.HasValue);

            RuleFor(x => x.OriginalPrice)
                .GreaterThan(0).WithMessage("Giá gốc phải lớn hơn 0")
                .LessThan(1_000_000_000).WithMessage("Giá gốc không hợp lệ")
                .When(x => x.OriginalPrice.HasValue);

            RuleFor(x => x.DiscountPercent)
                .InclusiveBetween(0, 99).WithMessage("Phần trăm giảm giá phải từ 0 đến 99")
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
        }
    }
}