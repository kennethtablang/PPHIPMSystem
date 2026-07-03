using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using PPHIPMSystem.Server.Data;
using PPHIPMSystem.Server.Data.Seeders;
using PPHIPMSystem.Server.Interfaces;
using PPHIPMSystem.Server.Models;
using PPHIPMSystem.Server.Services;
using PPHIPMSystem.Server.Hubs;

namespace PPHIPMSystem.Server
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Database
            builder.Services.AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

            // Identity
            builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
            {
                // Hard floor; the admin-configurable rules (min length above 8,
                // special character) live in SystemPasswordValidator.
                options.Password.RequireDigit = true;
                options.Password.RequiredLength = 8;
                options.Password.RequireUppercase = true;
                options.Password.RequireNonAlphanumeric = false;
                options.User.RequireUniqueEmail = true;

                // Brute-force protection: 5 wrong passwords locks the account for 15 minutes.
                options.Lockout.AllowedForNewUsers = true;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            })
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddPasswordValidator<SystemPasswordValidator>()
            .AddDefaultTokenProviders();

            // JWT Authentication
            var jwtKey = builder.Configuration["Jwt:Key"]
                ?? throw new InvalidOperationException("JWT Key is not configured.");
            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = builder.Configuration["Jwt:Issuer"],
                    ValidAudience = builder.Configuration["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
                };
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;
                        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                        {
                            context.Token = accessToken;
                        }
                        return Task.CompletedTask;
                    },
                    // Tokens live 8 hours, so deactivating an account must be
                    // checked per request — otherwise the old token keeps working
                    // until it expires. Cached 60s to avoid a DB hit on every call.
                    OnTokenValidated = async context =>
                    {
                        var userId = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                        if (userId is null)
                        {
                            context.Fail("Invalid token.");
                            return;
                        }

                        var cache = context.HttpContext.RequestServices.GetRequiredService<IMemoryCache>();
                        var isActive = await cache.GetOrCreateAsync($"user-active:{userId}", async entry =>
                        {
                            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(60);
                            var db = context.HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>();
                            return await db.Users.AsNoTracking()
                                .Where(u => u.Id == userId)
                                .Select(u => (bool?)u.IsActive)
                                .FirstOrDefaultAsync() ?? false;
                        });

                        if (!isActive) context.Fail("Account is deactivated.");
                    }
                };
            });

            builder.Services.AddMemoryCache();

            builder.Services.AddAuthorization();
            builder.Services.AddScoped<IClaimsTransformation, SuperAdminClaimsTransformation>();

            // AutoMapper
            builder.Services.AddAutoMapper(cfg => cfg.AddMaps(typeof(Program)));

            // Service Layer
            builder.Services.AddScoped<IAuditLogService, AuditLogService>();
            builder.Services.AddScoped<INotificationService, NotificationService>();
            builder.Services.AddScoped<IEmailService, EmailService>();
            builder.Services.AddScoped<IAuthService, AuthService>();
            builder.Services.AddScoped<IUserService, UserService>();
            builder.Services.AddScoped<IDepartmentService, DepartmentService>();
            builder.Services.AddScoped<ICategoryService, CategoryService>();
            builder.Services.AddScoped<IInventoryService, InventoryService>();
            builder.Services.AddScoped<IItemBatchService, ItemBatchService>();
            builder.Services.AddScoped<IStockMovementService, StockMovementService>();
            builder.Services.AddScoped<IStockAdjustmentService, StockAdjustmentService>();
            builder.Services.AddScoped<ISupplierService, SupplierService>();
            builder.Services.AddScoped<IProcurementService, ProcurementService>();
            builder.Services.AddScoped<IForecastService, ForecastService>();
            builder.Services.AddScoped<IReportService, ReportService>();
            builder.Services.AddScoped<IReportExportService, ReportExportService>();
            builder.Services.AddScoped<IInventoryImportService, InventoryImportService>();
            builder.Services.AddScoped<IBackupService, BackupService>();
            builder.Services.AddScoped<ISystemSettingsService, SystemSettingsService>();

            builder.Services.AddHostedService<ExpirationCheckService>();
            builder.Services.AddHostedService<BackupSchedulerService>();
            builder.Services.AddHostedService<MaintenanceSchedulerService>();

            // The React client sends and expects enum values as strings
            // (e.g. "Issuance", "MovingAverage", "SubmittedToProcurement").
            builder.Services.AddControllers()
                .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(
                    new System.Text.Json.Serialization.JsonStringEnumConverter()));
            builder.Services.AddSignalR()
                .AddJsonProtocol(o => o.PayloadSerializerOptions.Converters.Add(
                    new System.Text.Json.Serialization.JsonStringEnumConverter()));

            // Swagger
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "IPMS API", Version = "v1" });
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Description = "JWT Authorization header. Enter: Bearer {token}",
                    Name = "Authorization",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.ApiKey,
                    Scheme = "Bearer"
                });
                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
                        Array.Empty<string>()
                    }
                });
            });

            // Behind a reverse proxy (IIS/nginx) every request arrives from the proxy's
            // IP; honor X-Forwarded-For so per-IP rate limiting and audit logging see
            // the real client. Restrict KnownProxies/Networks if exposed beyond the LAN.
            builder.Services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
                options.KnownNetworks.Clear();
                options.KnownProxies.Clear();
            });

            // Throttle credential guessing and email-sending abuse per client IP.
            builder.Services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
                options.OnRejected = async (ctx, ct) =>
                {
                    ctx.HttpContext.Response.ContentType = "application/json";
                    await ctx.HttpContext.Response.WriteAsync(
                        "{\"message\":\"Too many attempts. Please wait a moment and try again.\"}", ct);
                };

                // Sign-in attempts: 10 per minute per IP.
                options.AddPolicy("auth", httpContext =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));

                // Endpoints that send email (reset links, OTPs): 3 per 5 minutes per IP.
                options.AddPolicy("auth-email", httpContext =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                        _ => new FixedWindowRateLimiterOptions { PermitLimit = 3, Window = TimeSpan.FromMinutes(5) }));
            });

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend", policy =>
                    policy.WithOrigins("https://localhost:59350", "http://localhost:5173")
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials()
                          // Lets the client read the export filename from downloads.
                          .WithExposedHeaders("Content-Disposition"));
            });

            var app = builder.Build();

            app.UseForwardedHeaders();
            app.UseDefaultFiles();
            app.MapStaticAssets();

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "IPMS API v1"));
            }
            else
            {
                // Safety net: any unhandled exception becomes a clean JSON 500
                // instead of a raw crash page (dev keeps the detailed page).
                app.UseExceptionHandler(a => a.Run(async context =>
                {
                    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                    await context.Response.WriteAsJsonAsync(new { message = "An unexpected error occurred." });
                }));
            }

            app.UseHttpsRedirection();
            app.UseCors("AllowFrontend");
            app.UseRateLimiter();
            app.UseAuthentication();
            app.UseAuthorization();
            app.MapControllers();
            app.MapHub<NotificationHub>("/hubs/notifications");
            app.MapHub<ForecastHub>("/hubs/forecast");
            app.MapFallbackToFile("/index.html");

            // Seed database
            await DataSeeder.SeedAsync(app.Services);
            await MockDataSeeder.SeedAsync(app.Services);

            app.Run();
        }
    }
}
