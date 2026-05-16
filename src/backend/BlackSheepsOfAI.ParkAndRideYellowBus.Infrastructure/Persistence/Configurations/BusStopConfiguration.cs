using BlackSheepsOfAI.ParkAndRideYellowBus.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.Persistence.Configurations;

public sealed class BusStopConfiguration : IEntityTypeConfiguration<BusStop>
{
    public void Configure(EntityTypeBuilder<BusStop> builder)
    {
        builder.ToTable("bus_stop");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("id")
            .ValueGeneratedOnAdd();

        builder.Property(x => x.Geom)
            .HasColumnName("geom")
            .HasColumnType("geometry")
            .IsRequired();

        builder.Property(x => x.Name)
            .HasColumnName("name")
            .HasColumnType("character varying")
            .IsRequired();
    }
}
