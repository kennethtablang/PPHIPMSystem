namespace PPHIPMSystem.Server.DTOs.System;

// Public shape of the configurable password policy (safe to expose anonymously —
// the reset-password page needs it before login).
public class PasswordPolicyDto
{
    public int MinLength { get; set; } = 8;
    public bool RequireSpecial { get; set; } = true;
}
