using api.DTOs.quote;
using api.models.enums;
using api.services.implementations.quote;
using api.validators.quote;

namespace api.Tests.Rfq
{
    public class QuoteRequestServiceTests
    {
        [Theory]
        [InlineData(QuoteStatus.Pending, QuoteStatus.Contacted, false, true)]
        [InlineData(QuoteStatus.Pending, QuoteStatus.Quoted, false, true)]
        [InlineData(QuoteStatus.Pending, QuoteStatus.Completed, false, false)]
        [InlineData(QuoteStatus.Contacted, QuoteStatus.Quoted, false, true)]
        [InlineData(QuoteStatus.Quoted, QuoteStatus.Accepted, false, true)]
        [InlineData(QuoteStatus.Accepted, QuoteStatus.InProduction, false, true)]
        [InlineData(QuoteStatus.InProduction, QuoteStatus.Completed, false, true)]
        [InlineData(QuoteStatus.Completed, QuoteStatus.Pending, false, false)]
        [InlineData(QuoteStatus.Rejected, QuoteStatus.Quoted, false, false)]
        [InlineData(QuoteStatus.Cancelled, QuoteStatus.Pending, false, false)]
        [InlineData(QuoteStatus.Pending, QuoteStatus.Cancelled, true, true)]
        [InlineData(QuoteStatus.Quoted, QuoteStatus.Cancelled, true, true)]
        [InlineData(QuoteStatus.InProduction, QuoteStatus.Cancelled, true, false)]
        [InlineData(QuoteStatus.Pending, QuoteStatus.Quoted, true, false)]
        public void StatusTransition_RespectsStateMachineRules(
            QuoteStatus current,
            QuoteStatus next,
            bool isCustomerAction,
            bool expectedAllowed)
        {
            var allowed = QuoteStatusTransitionHelper.CanTransition(current, next, isCustomerAction);
            Assert.Equal(expectedAllowed, allowed);

            if (!expectedAllowed)
            {
                Assert.Throws<InvalidOperationException>(() =>
                    QuoteStatusTransitionHelper.EnsureTransitionAllowed(current, next, isCustomerAction));
            }
        }

        [Fact]
        public void CreateQuoteValidator_AcceptsValidPayload()
        {
            var validator = new CreateQuoteRequestDtoValidator();
            var dto = new CreateQuoteRequestDto
            {
                CustomerName = "Nguyễn Văn A",
                Phone = "0901234567",
                Email = "a@club.vn",
                OrganizationName = "CLB Bóng Đá K65",
                Quantity = 30,
                Material = "Cotton 100% 2 chiều",
                PrintTechnique = PrintTechnique.DtfPrint,
                SizeBreakdown = new Dictionary<string, int>
                {
                    ["M"] = 10,
                    ["L"] = 15,
                    ["XL"] = 5
                },
                ExpectedDeliveryDate = DateTime.UtcNow.Date.AddDays(10)
            };

            var result = validator.Validate(dto);
            Assert.True(result.IsValid);
        }

        [Fact]
        public void CreateQuoteValidator_RejectsHoneypot_SizeMismatch_AndInvalidPhone()
        {
            var validator = new CreateQuoteRequestDtoValidator();
            var dto = new CreateQuoteRequestDto
            {
                CustomerName = "Bot User",
                Phone = "12345",
                Email = "bot@example.com",
                Quantity = 20,
                SizeBreakdown = new Dictionary<string, int> { ["M"] = 10, ["L"] = 5 },
                ExpectedDeliveryDate = DateTime.UtcNow.Date.AddDays(-1),
                Website = "https://spam.example"
            };

            var result = validator.Validate(dto);

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateQuoteRequestDto.Website));
            Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateQuoteRequestDto.Phone));
            Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateQuoteRequestDto.SizeBreakdown));
            Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateQuoteRequestDto.ExpectedDeliveryDate));
        }
    }
}

