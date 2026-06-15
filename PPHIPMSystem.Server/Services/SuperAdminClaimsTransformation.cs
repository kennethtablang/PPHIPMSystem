using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;

namespace PPHIPMSystem.Server.Services;

public class SuperAdminClaimsTransformation : IClaimsTransformation
{
    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.IsInRole("SuperAdmin") && !principal.IsInRole("HospitalAdministrator"))
        {
            var identity = (ClaimsIdentity)principal.Identity!;
            identity.AddClaim(new Claim(ClaimTypes.Role, "HospitalAdministrator"));
        }
        return Task.FromResult(principal);
    }
}
