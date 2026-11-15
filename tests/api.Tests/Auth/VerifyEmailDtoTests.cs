using System.ComponentModel.DataAnnotations;
using api.DTOs.user;

namespace api.Tests.Auth;

public class VerifyEmailDtoTests
{
    [Theory]
    [InlineData("123456", true)]
    [InlineData("12345", false)]
    [InlineData("12a456", false)]
    public void Validation_RequiresExactlySixOtpDigits(string otp, bool expectedValid)
    {
        var dto = new VerifyEmailDto { Email = "member@example.com", Otp = otp };
        var results = new List<ValidationResult>();

        var valid = Validator.TryValidateObject(dto, new ValidationContext(dto), results, true);

        Assert.Equal(expectedValid, valid);
    }
}
