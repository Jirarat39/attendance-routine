using Microsoft.EntityFrameworkCore;

namespace AttendanceRoutine.Api.Data;

public sealed class AttendanceDbContext(DbContextOptions<AttendanceDbContext> options) : DbContext(options);

