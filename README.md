ŽutiBus Split

Optimized school bus routes for the city of Split — safer commutes for kids, fewer cars in the morning, less stress for parents.

The problem
Every weekday morning in Split, thousands of parents drive their kids to school. Public buses (Promet) get crowded, some kids walk long distances along busy roads, and traffic around schools peaks exactly when it's most dangerous for pedestrians. Unlike many countries, Croatian cities don't operate dedicated school transport — there is no organized "yellow bus" system that knows where each kid lives and where they need to go.
The result:

Avoidable morning traffic concentrated around schools
Parents losing 30–60 minutes a day to school runs
Kids walking in summer heat or winter rain along roads without proper sidewalks
Wasted capacity — many parents drive the same route, alone with one child

The idea
ŽutiBus is a city-operated school bus service planned by software, not by guesswork.
At the start of the school year (with updates possible at any time), parents submit:

Where their child lives
Which school the child attends
The child's class schedule / start time

The system then:

Clusters nearby children into a small number of pickup stops within safe walking distance of each home.
Generates optimized bus routes that visit those stops and deliver each child to their school before class starts.
Publishes a schedule for parents and drivers.

The output is a small fleet of yellow buses running short, efficient morning and afternoon routes — instead of hundreds of cars duplicating each other.
Why Split

Geography fits the problem. Split's neighborhoods (Žnjan, Spinut, Pujanke, Mejaši, Sirobuja, Lovret, Bačvice, Stobreč…) are spread across a peninsula with limited arterial roads. A handful of well-planned routes can cover a lot of ground.
No existing equivalent. This isn't competing with Promet — it complements it. Promet covers general public transit; ŽutiBus covers a specific, time-bounded need.
Real safety wins. Many primary schools sit on streets that aren't safe to walk to from outlying parts of their catchment area.
Environmental story. Fewer single-occupancy car trips in the city center during the morning peak.

How it works
1. Parent submission
A simple web form (mobile-first):

Home address (with map pin)
One or more children, each linked to a school and start time
Contact info for the parent
Optional notes (mobility needs, etc.)

Submissions can be updated any time — moving house, switching schools, dropping out of the service.
2. Stop generation
A clustering step groups homes into pickup stops:

Each stop is within ~300 m walking distance of every home it serves
Stops are placed at safe, road-accessible points (not in the middle of pedestrian zones)
Stops aim for a minimum number of kids each, to keep the fleet small

3. Route optimization
A vehicle routing solver assigns stops to buses and orders them so that:

Every child reaches their school before class
Total bus-kilometers are minimized
No bus exceeds capacity
Each child's ride time stays under a reasonable cap (e.g. 30 min)

4. Outputs

For parents: stop location, pickup time, bus number
For drivers: turn-by-turn route, stop list with expected times
For the city: total fleet size, total distance, served-students count, projected car-trip reduction

MVP scope (hackathon deliverable)

 Parent submission form with map pin
 Admin view of all submissions on a map of Split
 Stop clustering algorithm (k-means or DBSCAN on home coordinates, snapped to road network)
 Route generation for one school (single-school demo)
 Visualization of routes on a Split map
 Parent-facing "your stop" preview screen

Stretch goals

Multi-school, multi-bus city-wide simulation
Live bus tracking for parents
SMS notifications ("bus 3 is 5 minutes away")
Driver mobile app with route navigation
Capacity dashboard for city planners
Integration with Promet timetables (for older kids who transfer)
Demand-responsive variant for sparsely populated areas

Tech stack (proposed)

Frontend: React + Vite, Leaflet or MapLibre for maps, Tailwind for styling
Backend: Node.js / Express or Python / FastAPI
Database: PostgreSQL with PostGIS for geospatial queries
Routing: OSRM or OpenRouteService against OpenStreetMap data for Split
Clustering: scikit-learn (DBSCAN) or custom Voronoi-based stop placement
VRP solver: Google OR-Tools (well-suited for school bus routing problems)
Hosting: anything cheap — Fly.io, Railway, Vercel for frontend

Data model (sketch)

Parent — contact info, account
Child — linked to one parent, one school, start time, optional needs
Home — geocoded address linked to a parent
School — name, location, daily start/end times
Stop — generated stop with location, assigned children
Route — ordered list of stops, assigned bus, school, time window
Bus — capacity, assignment

Open questions for the team
These are worth deciding early — they shape the whole project.

Single school or city-wide for the demo? A single school demo is far easier to ship and just as impressive visually.
Are stops reused from existing Promet stops, or generated fresh? Reusing Promet stops is realistic but constrains optimization. Fresh stops give better routes but require placement logic.
Who is the imagined operator? City of Split? A school? A private operator with city subsidy? Affects the pitch, not the code.
Privacy and data handling. Home addresses of children is sensitive data. Even for a hackathon demo, use fake data publicly and explain how real deployment would handle GDPR.

Pitch angle

"Split spends every morning moving the same kids in hundreds of separate cars. We move them in ten buses instead — and tell every parent exactly where to walk and when. The city gets quieter streets, parents get an hour back, and kids get a safer ride."

Team
To be filled in.
License
To be decided — MIT recommended for hackathon code.


