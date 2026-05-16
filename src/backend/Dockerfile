# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution-level files first so the layer is cached when only source changes.
COPY global.json              .
COPY Directory.Build.props    .
COPY BlackSheepsOfAI.ParkAndRideYellowBus.slnx .

# Copy each project file individually (triggers restore only when .csproj changes).
COPY BlackSheepsOfAI.ParkAndRideYellowBus.Core/BlackSheepsOfAI.ParkAndRideYellowBus.Core.csproj \
     BlackSheepsOfAI.ParkAndRideYellowBus.Core/
COPY BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure/BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure.csproj \
     BlackSheepsOfAI.ParkAndRideYellowBus.Infrastructure/
COPY BlackSheepsOfAI.ParkAndRideYellowBus.API/BlackSheepsOfAI.ParkAndRideYellowBus.API.csproj \
     BlackSheepsOfAI.ParkAndRideYellowBus.API/
COPY BlackSheepsOfAI.ParkAndRideYellowBus.SeedSubmissions/BlackSheepsOfAI.ParkAndRideYellowBus.SeedSubmissions.csproj \
     BlackSheepsOfAI.ParkAndRideYellowBus.SeedSubmissions/

RUN dotnet restore BlackSheepsOfAI.ParkAndRideYellowBus.slnx

# Copy all source and publish.
COPY . .
RUN dotnet publish BlackSheepsOfAI.ParkAndRideYellowBus.API \
        --configuration Release \
        --no-restore \
        --output /app/publish

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

# Bind to plain HTTP; TLS termination is handled outside the container.
ENV ASPNETCORE_URLS=http://+:5058
ENV ASPNETCORE_ENVIRONMENT=Development

EXPOSE 5058
ENTRYPOINT ["dotnet", "BlackSheepsOfAI.ParkAndRideYellowBus.API.dll"]
