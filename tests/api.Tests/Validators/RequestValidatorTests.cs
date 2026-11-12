using api.DTOs.chat;
using api.DTOs.quote;
using api.DTOs.review;
using api.validators.chat;
using api.validators.quote;
using api.validators.review;

namespace api.Tests.Validators;

public sealed class RequestValidatorTests
{
    [Fact]
    public void CreateQuoteRequestDtoValidator_AcceptsValidRfqRequest()
    {
        var validator = new CreateQuoteRequestDtoValidator();
        var dto = new CreateQuoteRequestDto
        {
            ProductId = "product-1",
            Quantity = 5,
            CustomerName = "Nguyen Van A",
            Phone = "0912345678",
            Email = "customer@example.com",
            Note = "Can bao gia so luong 5 cai"
        };

        var result = validator.Validate(dto);

        Assert.True(result.IsValid);
    }

    [Fact]
    public void CreateQuoteRequestDtoValidator_RejectsInvalidRfqRequest()
    {
        var validator = new CreateQuoteRequestDtoValidator();
        var dto = new CreateQuoteRequestDto
        {
            ProductId = "product-1",
            Quantity = 0,
            CustomerName = "",
            Phone = "invalid-phone",
            Email = "not-an-email"
        };

        var result = validator.Validate(dto);
        var invalidProperties = result.Errors.Select(error => error.PropertyName).ToHashSet();

        Assert.False(result.IsValid);
        Assert.Contains(nameof(CreateQuoteRequestDto.Quantity), invalidProperties);
        Assert.Contains(nameof(CreateQuoteRequestDto.CustomerName), invalidProperties);
        Assert.Contains(nameof(CreateQuoteRequestDto.Phone), invalidProperties);
        Assert.Contains(nameof(CreateQuoteRequestDto.Email), invalidProperties);
    }

    [Fact]
    public void SendChatMessageDtoValidator_RejectsOversizedMessageAndUnknownType()
    {
        var validator = new SendChatMessageDtoValidator();
        var dto = new SendChatMessageDto
        {
            ChatRoomId = "room-1",
            Message = new string('m', 5001),
            MessageType = "Unsupported"
        };

        var result = validator.Validate(dto);
        var invalidProperties = result.Errors.Select(error => error.PropertyName).ToHashSet();

        Assert.False(result.IsValid);
        Assert.Contains(nameof(SendChatMessageDto.Message), invalidProperties);
        Assert.Contains(nameof(SendChatMessageDto.MessageType), invalidProperties);
    }

    [Fact]
    public void CreateReviewDtoValidator_RequiresRatingInRangeAndContentLimit()
    {
        var validator = new CreateReviewDtoValidator();
        var dto = new CreateReviewDto
        {
            ProductId = "product-1",
            Rating = 6,
            Content = new string('r', 2001)
        };

        var result = validator.Validate(dto);
        var invalidProperties = result.Errors.Select(error => error.PropertyName).ToHashSet();

        Assert.False(result.IsValid);
        Assert.Contains(nameof(CreateReviewDto.Rating), invalidProperties);
        Assert.Contains(nameof(CreateReviewDto.Content), invalidProperties);
    }
}
