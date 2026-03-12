import "./neighborhoods.css";

const NEIGHBORHOODS = [
  {
    emoji: "🌉",
    name: "Williamsburg",
    borough: "Brooklyn",
    vibe: "Young professional central. Great food, nightlife, and L train access. Gets expensive fast — 3-beds in the $3,500–$4,200 range.",
    avgRent: "$3,850/mo",
    toMidtown: "~30 min",
    subway: "L train",
    vibeLabel: "Trendy",
    tags: ["Good bars", "Busy", "Walk-friendly"],
  },
  {
    emoji: "🏛️",
    name: "Brooklyn Heights",
    borough: "Brooklyn",
    vibe: "Quieter, more residential. Gorgeous brownstones, promenade views of Manhattan. Strong 2/3 train access. Premium pricing for the calm.",
    avgRent: "$4,100/mo",
    toMidtown: "~25 min",
    subway: "2/3/A/C",
    vibeLabel: "Calm",
    tags: ["Quiet", "Scenic", "Families"],
  },
  {
    emoji: "🍜",
    name: "Lower East Side",
    borough: "Manhattan",
    vibe: "Dense, lively, Manhattan convenience. Great restaurant scene. Can be loud on weekends. Your budget works here but you'll be competitive.",
    avgRent: "$4,200/mo",
    toMidtown: "~20 min",
    subway: "F/J/M/Z",
    vibeLabel: "Lively",
    tags: ["Nightlife", "Walkable", "Loud"],
  },
  {
    emoji: "🌿",
    name: "Astoria",
    borough: "Queens",
    vibe: "Best value on your list. Diverse food scene, chill vibe, easier to get a nicer place for less. N/W train to Midtown is reliable. Often overlooked by recent grads.",
    avgRent: "$3,100/mo",
    toMidtown: "~30 min",
    subway: "N/W",
    vibeLabel: "Chill",
    tags: ["Best value", "Spacious", "Underrated"],
  },
  {
    emoji: "🎨",
    name: "Bushwick",
    borough: "Brooklyn",
    vibe: "Creative, artsy, younger crowd. More space for less than Williamsburg. L train dependent. Getting pricier but still solid value for bigger apartments.",
    avgRent: "$3,200/mo",
    toMidtown: "~40 min",
    subway: "L/J/M",
    vibeLabel: "Artsy",
    tags: ["Creative", "Value", "Younger crowd"],
  },
  {
    emoji: "🌆",
    name: "Long Island City",
    borough: "Queens",
    vibe: "Manhattan skyline views, newer buildings, fast commute. Feels a bit sterile but extremely convenient. Good for people who want space and easy access to midtown.",
    avgRent: "$3,600/mo",
    toMidtown: "~15 min",
    subway: "7/E/M/N/W",
    vibeLabel: "Modern",
    tags: ["Fast commute", "New builds", "Views"],
  },
];

export default function NeighborhoodsPage() {
  return (
    <div className="neighborhoods-page">
      <div className="hoods-grid">
        {NEIGHBORHOODS.map((hood) => (
          <article key={hood.name} className="hood-card">
            <div className="hood-banner">{hood.emoji}</div>
            <div className="hood-body">
              <h2 className="hood-name">{hood.name}</h2>
              <div className="hood-borough">{hood.borough}</div>
              <p className="hood-vibe">{hood.vibe}</p>
              <div className="hood-stats">
                <div className="hood-stat">
                  <div className="hood-stat-key">Avg 3-bed</div>
                  <div className="hood-stat-val">{hood.avgRent}</div>
                </div>
                <div className="hood-stat">
                  <div className="hood-stat-key">To Midtown</div>
                  <div className="hood-stat-val">{hood.toMidtown}</div>
                </div>
                <div className="hood-stat">
                  <div className="hood-stat-key">Subway</div>
                  <div className="hood-stat-val">{hood.subway}</div>
                </div>
                <div className="hood-stat">
                  <div className="hood-stat-key">Vibe</div>
                  <div className="hood-stat-val">{hood.vibeLabel}</div>
                </div>
              </div>
              <div className="hood-tags">
                {hood.tags.map((tag) => (
                  <span key={tag} className="hood-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
