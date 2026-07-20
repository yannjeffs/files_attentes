using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Agency> Agencies => Set<Agency>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<Counter> Counters => Set<Counter>();
    public DbSet<ServiceCounter> ServiceCounters => Set<ServiceCounter>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<Rating> Ratings => Set<Rating>();
    public DbSet<WhatsAppNotification> WhatsAppNotifications => Set<WhatsAppNotification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Service Counter - clé composite en plus de l'id
        modelBuilder.Entity<ServiceCounter>()
         .HasOne(sc => sc.Service)
         .WithMany(s => s.ServiceCounters)
         .HasForeignKey(sc => sc.ServiceId)
         .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ServiceCounter>()
            .HasOne(sc => sc.Counter)
            .WithMany(c => c.ServiceCounters)
            .HasForeignKey(sc => sc.CounterId)
            .OnDelete(DeleteBehavior.Restrict);

        // Ticket -> Agent (évite le conflit avec cascade)
        modelBuilder.Entity<Ticket>()
            .HasOne(t => t.Agent)
            .WithMany(u => u.Tickets)
            .HasForeignKey(t => t.AgentId)
            .OnDelete(DeleteBehavior.Restrict);

        // Ticket -> Counter
        modelBuilder.Entity<Ticket>()
            .HasOne(t => t.Counter)
            .WithMany(c => c.Tickets)
            .HasForeignKey(t => t.CounterId)
            .OnDelete(DeleteBehavior.Restrict);

        // Enums stockés en string
        modelBuilder.Entity<User>()
            .Property(u => u.Role)
            .HasConversion<string>();

        // User → Counter (un agent est assigné à un guichet)
        // Restrict pour éviter les cascades multiples
        modelBuilder.Entity<User>()
            .HasOne(u => u.Counter)
            .WithMany()
            .HasForeignKey(u => u.CounterId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Ticket>()
            .Property(t => t.Status)
            .HasConversion<string>();

        modelBuilder.Entity<Ticket>()
            .Property(t => t.Status)
            .HasConversion<string>();

        modelBuilder.Entity<Ticket>()
            .Property(t => t.Priority)
            .HasConversion<string>();

        modelBuilder.Entity<WhatsAppNotification>()
            .Property(n => n.Status)
            .HasConversion<string>();
    }
}
