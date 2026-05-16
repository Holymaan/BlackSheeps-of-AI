# ŽutiBus — Backend

.NET 10 backend for the ŽutiBus school bus routing service.

## Solution layout

`BlackSheepsOfAI.ParkAndRideYellowBus.slnx` — three projects in a Clean
Architecture arrangement:

| Project | Type | Role |
|---|---|---|
| `BlackSheepsOfAI.ParkAndRideYellowBus.API` | ASP.NET Core Web API (Minimal APIs) | HTTP host and composition root |
| `BlackSheepsOfAI.ParkAndRideYellowBus.Core` | Class library | Domain — entities, interfaces, business rules |
| `BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure` | Class library | EF Core / PostgreSQL, external services (geocoding, Valhalla) |

Reference direction: `API → Core`, `API → Infrastructure`, `Infrastructure → Core`.
`Core` has no outgoing references.

Shared build settings (`net10.0`, nullable, implicit usings) live in
`Directory.Build.props`. `global.json` pins the solution to the .NET 10 SDK.

> No authentication yet — this is the demo skeleton. A hardcoded admin token or
> real auth can be added later.

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- A reachable PostgreSQL instance (only needed to *apply* migrations / run against a real DB)

## Common commands

Run from `src/backend/`:

```bash
dotnet build                                                    # build the whole solution
dotnet run --project BlackSheepsOfAI.ParkAndRideYellowBus.API   # run the API
```

The API exposes:

- `GET /health` → `{"status":"ok"}`
- `GET /openapi/v1.json` → OpenAPI document (Development environment only)

On first HTTPS run you may need to trust the dev certificate once:

```bash
dotnet dev-certs https --trust
```

## Database & migrations (EF Core + PostgreSQL)

The data layer uses **EF Core 10** with the **Npgsql** PostgreSQL provider, all in
the Infrastructure project:

- `Persistence/ApplicationDbContext.cs` — the `DbContext`. Add `DbSet<T>` properties
  and `IEntityTypeConfiguration<T>` classes here as domain entities are introduced.
- `Persistence/ApplicationDbContextFactory.cs` — an `IDesignTimeDbContextFactory`,
  so the EF tools can run against Infrastructure **on its own** (no API project needed).
- `DependencyInjection.cs` — `AddInfrastructure(IConfiguration)`, called from the
  API's `Program.cs`, registers the `DbContext` with the runtime connection string.

### Connection strings

- **Runtime (API):** `ConnectionStrings:DefaultConnection` in `appsettings.json`.
- **Design time (`dotnet ef`):** the `ZUTIBUS_DB_CONNECTION` environment variable,
  falling back to a local-dev default if it is not set.

### EF Core tools

`dotnet-ef` is pinned in `.config/dotnet-tools.json`. Restore it once per clone:

```bash
dotnet tool restore
```

### Adding & applying migrations

Migration commands target **only the Infrastructure project** — pass it as both
`--project` and `--startup-project`:

```bash
# create a migration after adding/changing entities
dotnet ef migrations add <MigrationName> \
  --project         BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure \
  --startup-project BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure \
  --output-dir      Persistence/Migrations

# apply migrations to the database
dotnet ef database update \
  --project         BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure \
  --startup-project BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure
```
