using api.DTOs.chat;
using FluentValidation;

namespace api.validators.chat;

public sealed class StartSupportChatDtoValidator : AbstractValidator<StartSupportChatDto>
{
    public StartSupportChatDtoValidator()
    {
        RuleFor(x => x.Subject)
            .MaximumLength(500)
            .When(x => !string.IsNullOrWhiteSpace(x.Subject));

        RuleFor(x => x.ProductId)
            .MaximumLength(50)
            .When(x => !string.IsNullOrWhiteSpace(x.ProductId));

        RuleFor(x => x.QuoteRequestId)
            .MaximumLength(50)
            .When(x => !string.IsNullOrWhiteSpace(x.QuoteRequestId));

        RuleFor(x => x.InitialMessage)
            .MaximumLength(5000)
            .When(x => !string.IsNullOrWhiteSpace(x.InitialMessage));
    }
}
