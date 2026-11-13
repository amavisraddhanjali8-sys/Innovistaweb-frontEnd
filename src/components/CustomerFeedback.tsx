import styles from "../cssModules/CustomerFeedback.module.css";
import SimpleScrollStack, { ScrollStackItem } from "./SimpleScrollStack";
import MainHeading from "./MainHeading";

const HOME_TESTIMONIALS = [
  {
    id: "fb-1",
    name: "Nalin Jayawardena",
    role: "Managing Director · Apex Tower Holdings",
    avatar: "/assets/about/director.jpg",
    quote:
      "Innovista delivered twelve storeys of solar-control curtain wall ahead of structural schedule with flawless acoustic sealing.",
  },
  {
    id: "fb-2",
    name: "Dilini Perera",
    role: "Principal Architect · Studio Harborline",
    avatar: "/assets/about/team-architect.jpg",
    quote:
      "Their 22mm slim-line thermal sliders gave our coastal villa projects crisp horizon sightlines with zero salt-air rattle.",
  },
  {
    id: "fb-3",
    name: "Roshan Fernando",
    role: "Head of Projects · Serendib Commercial",
    avatar: "/assets/about/team-structural.jpg",
    quote:
      "Laser site measurements meant every 3.4m partition bay and automatic access door slotted in cleanly on first installation.",
  },
  {
    id: "fb-4",
    name: "Kavinda De Silva",
    role: "Operations Director · Horizon Hospitality",
    avatar: "/assets/about/team-fabrication.jpg",
    quote:
      "Our resort suites saw a noticeable drop in cooling load after upgrading to Innovista double-glazed acoustic balconies.",
  },
];

function CustomerFeedback() {
  return (
    <section className={styles.container} aria-label="Client Testimonials">
      <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <MainHeading
          heading="What Our Clients Say"
          description="Verified project partners across residential developments, commercial towers, and hospitality pavilions."
        />
        <SimpleScrollStack>
          {HOME_TESTIMONIALS.map((item) => (
            <ScrollStackItem key={item.id}>
              <div className={styles.card}>
                <div className={styles.avatar}>
                  <img
                    src={item.avatar}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    loading="eager"
                    decoding="async"
                  />
                </div>
                <h3 className={styles.designation}>{item.name}</h3>
                <div className={styles.role}>{item.role}</div>
                <p className={styles.feedback}>"{item.quote}"</p>
              </div>
            </ScrollStackItem>
          ))}
        </SimpleScrollStack>
      </div>
    </section>
  );
}

export default CustomerFeedback;
