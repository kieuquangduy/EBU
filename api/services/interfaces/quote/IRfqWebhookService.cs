using api.models.entities;

namespace api.services.interfaces.quote
{
    public interface IRfqWebhookService
    {
        Task NotifyQuoteCreatedAsync(QuoteRequest quote, CancellationToken ct = default);
    }
}

