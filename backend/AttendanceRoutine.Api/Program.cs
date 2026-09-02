using AttendanceRoutine.Api.Data;
using AttendanceRoutine.Api.Options;
using AttendanceRoutine.Api.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

var connectionString = builder.Configuration.GetConnectionString("AttendanceDb") ?? string.Empty;

// Log warning if connection string is empty
if (string.IsNullOrWhiteSpace(connectionString))
{
    System.Console.WriteLine("WARNING: Database connection string is empty. Using in-memory database as fallback.");
}

builder.Services.Configure<DatabaseMappingOptions>(builder.Configuration.GetSection(DatabaseMappingOptions.SectionName));
builder.Services.Configure<ReportOptions>(builder.Configuration.GetSection(ReportOptions.SectionName));
builder.Services.AddDbContext<AttendanceDbContext>(options =>
{
    if (!string.IsNullOrWhiteSpace(connectionString))
    {
        options.UseSqlServer(connectionString, sql =>
        {
            sql.EnableRetryOnFailure(3, TimeSpan.FromSeconds(3), null);
            sql.CommandTimeout(60);
        });
    }
    else
    {
        // Use in-memory database as fallback when connection string is not available
        options.UseInMemoryDatabase("AttendanceDb_Fallback");
    }
});
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<ReportSettingsStore>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<DatabaseSchemaResolver>();
builder.Services.AddScoped<AttendanceQueryService>();
builder.Services.AddScoped<ExcelReportService>();
builder.Services.AddScoped<TimesheetQueryService>();
builder.Services.AddScoped<TimesheetExcelService>();
builder.Services.AddHostedService<DailyReportWorker>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddProblemDetails();
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "attendance_auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = false;
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(
        "login",
        context => RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                     ?? ["http://localhost:5173"];
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.UseSwagger();
app.UseSwaggerUI();
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();
