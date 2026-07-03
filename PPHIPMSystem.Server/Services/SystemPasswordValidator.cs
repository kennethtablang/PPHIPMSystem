using Microsoft.AspNetCore.Identity;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;

namespace PPHIPMSystem.Server.Services;

// Enforces the admin-configurable parts of the password policy (min length,
// special character) on every password create/change/reset. The static Identity
// options in Program.cs keep the hard floor (length 8, digit, upper/lowercase);
// this validator layers the runtime-configurable rules on top.
public class SystemPasswordValidator : IPasswordValidator<ApplicationUser>
{
    private readonly ISystemSettingsService _settings;

    public SystemPasswordValidator(ISystemSettingsService settings) => _settings = settings;

    public async Task<IdentityResult> ValidateAsync(UserManager<ApplicationUser> manager, ApplicationUser user, string? password)
    {
        var policy = await _settings.GetPasswordPolicyAsync();
        var errors = new List<IdentityError>();

        if (password is null || password.Length < policy.MinLength)
            errors.Add(new IdentityError
            {
                Code = "PasswordTooShortPolicy",
                Description = $"Password must be at least {policy.MinLength} characters long."
            });

        if (policy.RequireSpecial && (password is null || password.All(char.IsLetterOrDigit)))
            errors.Add(new IdentityError
            {
                Code = "PasswordRequiresSpecialPolicy",
                Description = "Password must include at least one special character."
            });

        return errors.Count == 0 ? IdentityResult.Success : IdentityResult.Failed(errors.ToArray());
    }
}
