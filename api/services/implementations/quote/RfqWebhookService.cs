using System.Text;
using System.Text.Json;
using api.models.entities;
using api.services.interfaces.quote;

namespace api.services.implementations.quote
{
    public class RfqWebhookService : IRfqWebhookService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<RfqWebhookService> _logger;

        public RfqWebhookService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<RfqWebhookService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task NotifyQuoteCreatedAsync(QuoteRequest quote, CancellationToken ct = default)
        {
            var webhookEnabled = _configuration.GetValue<bool>("Notifications:WebhookEnabled");
            var webhookUrl = _configuration["Notifications:WebhookUrl"];

            if (!webhookEnabled || string.IsNullOrWhiteSpace(webhookUrl))
            {
                return;
            }

            try
            {
                var client = _httpClientFactory.CreateClient();
                var payload = JsonSerializer.Serialize(new
                {
                    text = $"[HauShop RFQ mới] {quote.QuoteCode} - {quote.CustomerName} ({quote.Phone}) - SL: {quote.Quantity}"
                });
                using var content = new StringContent(payload, Encoding.UTF8, "application/json");
                using var response = await client.PostAsync(webhookUrl, content, ct);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "RFQ webhook returned HTTP {StatusCode} for {QuoteCode}",
                        (int)response.StatusCode,
                        quote.QuoteCode);
                }
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "RFQ webhook failed for {QuoteCode}", quote.QuoteCode);
            }
        }
    }
}

