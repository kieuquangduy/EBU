namespace api.services.interfaces.auth
{
    public interface IEmailService
    {
        Task SendPasswordResetOtpAsync(
            string email,
            string firstName,
            string otp);

        Task SendPasswordChangedNotificationAsync(
            string email,
            string firstName);

        Task SendVerifyEmailAsync(
            string email,
            string verifyLink);

        Task SendQuoteCreatedAdminNotificationAsync(
            string adminEmail,
            string quoteCode,
            string customerName,
            string phone,
            int quantity,
            string? productName);

        Task SendQuotePricedCustomerAsync(
            string customerEmail,
            string customerName,
            string quoteCode,
            decimal quotedPrice,
            string? quotedNote);
    }
}
