using System.ComponentModel.DataAnnotations;

namespace api.DTOs.user
{
    public class VerifyEmailDto
    {
        [Required, EmailAddress, MaxLength(200)]
        public string Email { get; set; } = string.Empty;

        [Required, RegularExpression(@"^\d{6}$", ErrorMessage = "OTP must contain exactly 6 digits")]
        public string Otp { get; set; } = string.Empty;
    }
}
