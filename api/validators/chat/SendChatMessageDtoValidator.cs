using api.DTOs.chat;
using api.models.enums;
using api.services.implementations.chat;
using FluentValidation;

namespace api.validators.chat;

public sealed class SendChatMessageDtoValidator : AbstractValidator<SendChatMessageDto>
{
    public SendChatMessageDtoValidator()
    {
        RuleFor(x => x.ChatRoomId)
            .NotEmpty()
            .MaximumLength(50);

        RuleFor(x => x.Message)
            .NotEmpty()
            .MaximumLength(5000);

        RuleFor(x => x.MessageType)
            .Must(value => Enum.TryParse<ChatMessageType>(value, true, out _))
            .WithMessage("Message type is invalid.");

        RuleFor(x => x.Attachments)
            .Must(list => list == null || list.Count <= 5)
            .WithMessage("Tối đa 5 tệp đính kèm mỗi tin nhắn.");

        RuleForEach(x => x.Attachments!)
            .ChildRules(att =>
            {
                att.RuleFor(a => a.Url)
                    .NotEmpty()
                    .MaximumLength(500)
                    .Must(ChatContentSanitizer.IsSafeAttachmentUrl)
                    .WithMessage("URL tệp đính kèm không hợp lệ hoặc không an toàn.");

                att.RuleFor(a => a.Name)
                    .NotEmpty()
                    .MaximumLength(200);
            })
            .When(x => x.Attachments != null);
    }
}
