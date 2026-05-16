q:
ok we are making a project for Split city for yellow busses to take kids to school from different parts of the city and create routes for the busses and stops where they should pickup kids, idea is that parents would make a submission by beginning of school year (possible to update later) where they are and which school kids go to and we would create optimized routes and pickup points for busses to take kids to school. do you think this is viable as a hackathon idea for making split a better city for citizens. and write up some readme.md for the project with description. ask questions if needed



a:
Quick take on viability: yes, this is a solid hackathon idea, and it fits Split well for a few specific reasons. Croatian cities don't really have dedicated school buses the way some other countries do — kids mostly walk, take Promet (the regular city bus), or get driven by parents. So you're not duplicating an existing service; you're proposing something new. The morning car traffic around schools in Split is genuinely a problem, and the hilly/spread-out geography (Žnjan, Pujanke, Mejaši, Sirobuja, etc. all feeding into a fairly compact center) is exactly the kind of layout where route optimization actually pays off versus a fixed bus line.

The core technical problem — clustering home addresses into stops, then solving a vehicle routing problem with school start times as constraints — is well-studied and very buildable in a hackathon timeframe. The pitch story also writes itself: less traffic, less parental driving, safer commute, lower emissions, better for kids living far from their school.

Things that would weaken the pitch if you don't address them: who pays for it, how it interacts with Promet, and what happens when a kid is sick or plans change. Worth at least having answers ready.

Let me draft the README based on reasonable assumptions, then ask a few things to tighten it.


