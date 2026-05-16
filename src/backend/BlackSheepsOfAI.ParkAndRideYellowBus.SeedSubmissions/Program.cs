using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BlackSheepsOfAI.ParkAndRideYellowBus.SeedSubmissions;

static class Program
{
    const string FormId = "3f1a7c9e-2b8d-4e6f-a1b2-c3d4e5f60718";

    static async Task Main(string[] args)
    {
        var baseUrl = args.Length > 0 ? args[0] : "http://localhost:5058";
        using var http = new HttpClient { BaseAddress = new Uri(baseUrl) };

        var submissions = BuildSubmissions();

        Console.WriteLine($"Posting {submissions.Count} submissions to {baseUrl}/form/{FormId}/submission ...");

        var ok = 0;
        for (var i = 0; i < submissions.Count; i++)
        {
            var res = await http.PostAsJsonAsync(
                $"/form/{FormId}/submission", submissions[i], s_jsonOpts);
            if (res.IsSuccessStatusCode)
            {
                ok++;
                Console.Write($"\r  {ok}/{submissions.Count}");
            }
            else
            {
                var body = await res.Content.ReadAsStringAsync();
                Console.WriteLine($"\n  FAIL #{i + 1}: {res.StatusCode} — {body}");
            }
        }

        Console.WriteLine($"\nDone. {ok}/{submissions.Count} submissions created.");
    }

    static List<SubmitRequest> BuildSubmissions()
    {
        var rng = new Random(42);
        var list = new List<SubmitRequest>(114);

        for (var i = 0; i < 114; i++)
        {
            var parent = s_parents[i % s_parents.Length];
            var child = s_childNames[i % s_childNames.Length];
            var addr = s_addresses[i % s_addresses.Length];
            var oib = GenerateOib(rng);

            list.Add(new SubmitRequest(1, new Dictionary<string, object?>
            {
                ["parentOib"] = oib,
                ["name"] = parent.First,
                ["lastName"] = parent.Last,
                ["childName"] = child,
                ["school"] = 53,
                ["homeAddress"] = new { address = addr.Street, lat = addr.Lat, lon = addr.Lon },
            }));
        }

        return list;
    }

    static string GenerateOib(Random rng)
    {
        Span<char> buf = stackalloc char[11];
        for (var j = 0; j < 11; j++)
            buf[j] = (char)('0' + rng.Next(10));
        return new string(buf);
    }

    // ── Static data ──────────────────────────────────────────────────────────

    static readonly JsonSerializerOptions s_jsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    static readonly (string First, string Last)[] s_parents =
    [
        ("Ivan", "Horvat"), ("Ana", "Kovačević"), ("Marko", "Babić"), ("Maja", "Marić"),
        ("Tomislav", "Jurić"), ("Ivana", "Novak"), ("Luka", "Knežević"), ("Petra", "Vuković"),
        ("Ante", "Matić"), ("Marina", "Perić"), ("Josip", "Tomić"), ("Katarina", "Pavlović"),
        ("Nikola", "Radić"), ("Lucija", "Šimić"), ("Davor", "Bošnjak"), ("Mirela", "Blažević"),
        ("Stjepan", "Grgić"), ("Nikolina", "Mandić"), ("Petar", "Mikulić"), ("Jelena", "Lovrić"),
        ("Frane", "Bašić"), ("Daria", "Petrović"), ("Matej", "Galić"), ("Antonija", "Vidović"),
        ("Goran", "Bilić"), ("Tina", "Tadić"), ("Boris", "Rakić"), ("Sandra", "Lončar"),
        ("Dražen", "Vučković"), ("Renata", "Šarić"), ("Mario", "Krstulović"), ("Ivona", "Čolak"),
        ("Branko", "Juričić"), ("Ankica", "Žuvela"), ("Krešimir", "Skočibušić"), ("Vedrana", "Nakić"),
        ("Zdenko", "Puljiz"), ("Martina", "Erceg"), ("Siniša", "Buljan"), ("Adriana", "Bralić"),
        ("Hrvoje", "Perkušić"), ("Danijela", "Grubišić"), ("Darko", "Radeljak"), ("Branka", "Delić"),
        ("Vladimir", "Stipić"), ("Dunja", "Vrdoljak"), ("Marin", "Ćurković"), ("Sanja", "Batinić"),
        ("Tonći", "Jerković"), ("Nela", "Parlov"), ("Robert", "Kuzmić"), ("Monika", "Režić"),
        ("Dragan", "Primorac"), ("Jasmina", "Pivac"), ("Filip", "Sučić"), ("Kristina", "Ljubičić"),
        ("Ivo", "Škaričić"), ("Gordana", "Kuzmanić"),
    ];

    static readonly string[] s_childNames =
    [
        "Luka", "Mia", "Ivan", "Ana", "Marko", "Petra", "Ante", "Lucija",
        "Frane", "Nina", "Matej", "Ema", "Josip", "Sara", "Nikola", "Dora",
        "Roko", "Marta", "Filip", "Klara", "Toni", "Lea", "Petar", "Iva",
        "Leon", "Jana", "Bruno", "Maja", "Dino", "Hana", "Niko", "Lana",
        "Stipe", "Lorena", "Jure", "Mila", "David", "Tena", "Karlo", "Vita",
        "Borna", "Anica", "Tin", "Stella", "Lovro", "Elena", "Dominik", "Karla",
        "Antonio", "Gabrijela", "Andrija", "Paula", "Šime", "Nika", "Viktor", "Katja",
        "Juraj", "Franka",
    ];

    static readonly (string Street, double Lat, double Lon)[] s_addresses =
    [
        // Žnjan
        ("Žnjanska ulica 2, Split", 43.5028, 16.4800),
        ("Žnjanska ulica 14, Split", 43.5032, 16.4810),
        ("Žnjanska ulica 26, Split", 43.5036, 16.4820),
        ("Žnjanska ulica 38, Split", 43.5040, 16.4830),
        ("Žnjanska ulica 50, Split", 43.5044, 16.4840),
        ("Žnjanska ulica 62, Split", 43.5048, 16.4850),
        // Trstenik
        ("Ulica Moliških Hrvata 3, Split", 43.5062, 16.4730),
        ("Ulica Moliških Hrvata 15, Split", 43.5066, 16.4738),
        ("Ulica Moliških Hrvata 27, Split", 43.5070, 16.4746),
        ("Ulica Moliških Hrvata 39, Split", 43.5074, 16.4754),
        ("Trstenik 5, Split", 43.5058, 16.4722),
        ("Trstenik 17, Split", 43.5054, 16.4714),
        // Mertojak
        ("Mertojak 4, Split", 43.5083, 16.4758),
        ("Mertojak 16, Split", 43.5087, 16.4766),
        ("Mertojak 28, Split", 43.5091, 16.4774),
        ("Mertojak 40, Split", 43.5095, 16.4782),
        ("Mertojačka ulica 7, Split", 43.5079, 16.4750),
        ("Mertojačka ulica 19, Split", 43.5075, 16.4742),
        // Pazdigrad
        ("Pazdigradska ulica 2, Split", 43.5055, 16.4830),
        ("Pazdigradska ulica 14, Split", 43.5059, 16.4838),
        ("Pazdigradska ulica 26, Split", 43.5063, 16.4846),
        ("Pazdigradska ulica 38, Split", 43.5067, 16.4854),
        ("Pazdigradska ulica 50, Split", 43.5071, 16.4862),
        ("Pazdigradska ulica 62, Split", 43.5075, 16.4870),
        // Duilovo
        ("Duilovačka ulica 3, Split", 43.5015, 16.4870),
        ("Duilovačka ulica 15, Split", 43.5019, 16.4878),
        ("Duilovačka ulica 27, Split", 43.5023, 16.4886),
        ("Duilovačka ulica 39, Split", 43.5027, 16.4894),
        ("Duilovačka ulica 51, Split", 43.5031, 16.4902),
        // Stobreč
        ("Stobrečka ulica 6, Split", 43.5020, 16.4960),
        ("Stobrečka ulica 18, Split", 43.5024, 16.4968),
        ("Stobrečka ulica 30, Split", 43.5028, 16.4976),
        ("Stobrečka ulica 42, Split", 43.5032, 16.4984),
        ("Stobrečka ulica 54, Split", 43.5036, 16.4992),
        ("Stobrečka ulica 66, Split", 43.5040, 16.5000),
        // Sirobuja
        ("Sirobujina ulica 4, Split", 43.5042, 16.4910),
        ("Sirobujina ulica 16, Split", 43.5046, 16.4918),
        ("Sirobujina ulica 28, Split", 43.5050, 16.4926),
        ("Sirobujina ulica 40, Split", 43.5054, 16.4934),
        ("Sirobujina ulica 52, Split", 43.5058, 16.4942),
        // Ravne njive
        ("Ravne njive 5, Split", 43.5120, 16.4780),
        ("Ravne njive 17, Split", 43.5124, 16.4788),
        ("Ravne njive 29, Split", 43.5128, 16.4796),
        ("Ravne njive 41, Split", 43.5132, 16.4804),
        ("Ravne njive 53, Split", 43.5136, 16.4812),
        // Firule
        ("Ulica Firula 8, Split", 43.5046, 16.4690),
        ("Ulica Firula 20, Split", 43.5050, 16.4698),
        ("Ulica Firula 32, Split", 43.5054, 16.4706),
        ("Ulica Firula 44, Split", 43.5058, 16.4714),
        // Poljička ulica
        ("Poljička ulica 3, Split", 43.5070, 16.4720),
        ("Poljička ulica 15, Split", 43.5074, 16.4728),
        ("Poljička ulica 27, Split", 43.5078, 16.4736),
        ("Poljička ulica 39, Split", 43.5082, 16.4744),
        ("Poljička ulica 51, Split", 43.5086, 16.4752),
        ("Poljička ulica 63, Split", 43.5090, 16.4760),
        // Bračka ulica
        ("Bračka ulica 2, Split", 43.5052, 16.4770),
        ("Bračka ulica 14, Split", 43.5056, 16.4778),
        ("Bračka ulica 26, Split", 43.5060, 16.4786),
        ("Bračka ulica 38, Split", 43.5064, 16.4794),
        // Lovrinac
        ("Lovrinačka ulica 7, Split", 43.5068, 16.4840),
        ("Lovrinačka ulica 19, Split", 43.5072, 16.4848),
        ("Lovrinačka ulica 31, Split", 43.5076, 16.4856),
        ("Lovrinačka ulica 43, Split", 43.5080, 16.4864),
        // Mejaši
        ("Mejaši 5, Split", 43.5090, 16.4880),
        ("Mejaši 17, Split", 43.5094, 16.4888),
        ("Mejaši 29, Split", 43.5098, 16.4896),
        ("Mejaši 41, Split", 43.5102, 16.4904),
        // Kila
        ("Kila 6, Split", 43.5100, 16.4820),
        ("Kila 18, Split", 43.5104, 16.4828),
        ("Kila 30, Split", 43.5108, 16.4836),
        // Vrboran
        ("Vrboranska ulica 4, Split", 43.5095, 16.4860),
        ("Vrboranska ulica 16, Split", 43.5099, 16.4868),
        ("Vrboranska ulica 28, Split", 43.5103, 16.4876),
        // Dragovode
        ("Dragovode 3, Split", 43.5110, 16.4800),
        ("Dragovode 15, Split", 43.5114, 16.4808),
        ("Dragovode 27, Split", 43.5118, 16.4816),
        // Visoka
        ("Ulica Visoka 8, Split", 43.5088, 16.4770),
        ("Ulica Visoka 20, Split", 43.5092, 16.4778),
        ("Ulica Visoka 32, Split", 43.5096, 16.4786),
        // Zbora narodne garde (east stretch)
        ("Zbora narodne garde 60, Split", 43.5078, 16.4800),
        ("Zbora narodne garde 72, Split", 43.5082, 16.4808),
        ("Zbora narodne garde 84, Split", 43.5086, 16.4816),
        // Smrdečac
        ("Smrdečac 5, Split", 43.5065, 16.4735),
        ("Smrdečac 17, Split", 43.5069, 16.4743),
        // Žnjan west
        ("Žnjan zapad 3, Split", 43.5035, 16.4785),
        ("Žnjan zapad 15, Split", 43.5039, 16.4793),
        // Križine
        ("Križine 4, Split", 43.5055, 16.4700),
        ("Križine 16, Split", 43.5059, 16.4708),
        // Put Žnjana
        ("Put Žnjana 7, Split", 43.5042, 16.4815),
        ("Put Žnjana 19, Split", 43.5046, 16.4823),
        ("Put Žnjana 31, Split", 43.5050, 16.4831),
        // Split 3
        ("Split 3 ulica 10, Split", 43.5060, 16.4750),
        ("Split 3 ulica 22, Split", 43.5064, 16.4758),
        ("Split 3 ulica 34, Split", 43.5068, 16.4766),
        // Kman (east side)
        ("Ulica Kmana 5, Split", 43.5112, 16.4750),
        ("Ulica Kmana 17, Split", 43.5116, 16.4758),
        ("Ulica Kmana 29, Split", 43.5120, 16.4766),
        // Šine / Stobreč approach
        ("Šine 8, Split", 43.5035, 16.4940),
        ("Šine 20, Split", 43.5039, 16.4948),
        // Strožanac approach
        ("Strožanačka cesta 3, Split", 43.5010, 16.5020),
        ("Strožanačka cesta 15, Split", 43.5014, 16.5028),
        // Brda east
        ("Brda 12, Split", 43.5135, 16.4760),
        ("Brda 24, Split", 43.5139, 16.4768),
        // Pujanke east
        ("Pujanke 50, Split", 43.5125, 16.4790),
        ("Pujanke 62, Split", 43.5129, 16.4798),
        // Neslanovac
        ("Neslanovac 3, Split", 43.5048, 16.4860),
        ("Neslanovac 15, Split", 43.5052, 16.4868),
        // Žnjan south
        ("Žnjanski put 8, Split", 43.5022, 16.4825),
        ("Žnjanski put 20, Split", 43.5026, 16.4833),
    ];
}

record SubmitRequest(
    [property: JsonPropertyName("formVersion")] int FormVersion,
    [property: JsonPropertyName("values")] Dictionary<string, object?> Values);
