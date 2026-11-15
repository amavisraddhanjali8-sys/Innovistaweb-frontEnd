import { useEffect, useRef } from "react";
import styles from "../cssModules/Milestones.module.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import MainHeading from "../components/MainHeading";
import PageMetadata from "../components/PageMetadata";

gsap.registerPlugin(ScrollTrigger);

type Milestone = {
  year: string;
  title: string;
  description: string;
  image: string;
};

const milestones: Milestone[] = [
  {
    year: "2015",
    title: "The Beginning",
    description:
      "Innovista Fabriconix was founded with a vision to revolutionize aluminium fabrication. Starting from a small workshop, we began our journey towards excellence.",
    image: "/assets/products/showroom.jpg",
  },
  {
    year: "2017",
    title: "First Major Project",
    description:
      "Completed our first large-scale commercial project, establishing our reputation for quality craftsmanship and precision engineering in the industry.",
    image: "/assets/products/facade-detail.jpg",
  },
  {
    year: "2019",
    title: "Expanding Horizons",
    description:
      "Expanded our operations with state-of-the-art machinery and a larger facility, enabling us to take on more ambitious projects across the region.",
    image: "/assets/about/pavilion.jpg",
  },
  {
    year: "2021",
    title: "Innovation & Technology",
    description:
      "Integrated modern design tools and advanced fabrication technology, pushing the boundaries of what's possible in aluminium construction.",
    image: "/assets/products/window.jpg",
  },
  {
    year: "2023",
    title: "Industry Recognition",
    description:
      "Received industry awards for excellence in fabrication and design. Our commitment to quality earned us partnerships with leading construction firms.",
    image: "/assets/about/facade.jpg",
  },
  {
    year: "2025",
    title: "Building the Future",
    description:
      "Continuing to shape innovation and build trust. With a growing team and expanding capabilities, we are ready to take on the challenges of tomorrow.",
    image: "/assets/about/terrace.jpg",
  },
];

function Milestones() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const line = timelineRef.current?.querySelector(`.${styles.centerLine}`);
      if (line) {
        gsap.fromTo(
          line,
          { scaleY: 0 },
          {
            scaleY: 1,
            duration: 1.5,
            ease: "power2.out",
            scrollTrigger: {
              trigger: timelineRef.current,
              start: "top 80%",
            },
          },
        );
      }

      cardsRef.current.forEach((card, index) => {
        if (!card) return;
        const isLeft = index % 2 === 0;
        const isCompact = typeof window !== "undefined" && window.innerWidth <= 768;

        gsap.fromTo(
          card,
          {
            opacity: 0,
            x: isCompact ? 0 : isLeft ? -120 : 120,
            y: isCompact ? 28 : 40,
            scale: isCompact ? 0.96 : 0.85,
            rotateY: isCompact ? 0 : isLeft ? -8 : 8,
          },
          {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            rotateY: 0,
            duration: isCompact ? 0.7 : 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 88%",
              end: "top 60%",
              toggleActions: "play none none none",
            },
          },
        );

        const dot = card.querySelector(`.${styles.dot}`);
        if (dot) {
          gsap.fromTo(
            dot,
            { scale: 0, rotate: -180 },
            {
              scale: 1,
              rotate: 0,
              duration: 0.6,
              ease: "back.out(3)",
              delay: 0.3,
              scrollTrigger: {
                trigger: card,
                start: "top 88%",
              },
            },
          );
        }

        const content = card.querySelector(`.${styles.card}`);
        if (content) {
          gsap.fromTo(
            content,
            { opacity: 0, y: 20 },
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: "power2.out",
              delay: 0.2,
              scrollTrigger: {
                trigger: card,
                start: "top 88%",
              },
            },
          );
        }
      });
    }, timelineRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className={styles.page}>
      <PageMetadata
        title="Our Milestones & Engineering Timeline"
        description="Explore Innovista Fabriconix's growth since 2015 across landmark commercial curtain wall projects, CNC fabrication, and ISO certification."
        canonicalPath="/milestones"
        ogImage="/assets/about/terrace.jpg"
      />
      <MainHeading
        heading="Our Milestones"
        description="A journey of growth, innovation, and excellence that defines who we are today."
      />

      <div className={styles.timeline} ref={timelineRef}>
        <div className={styles.centerLine}></div>

        {milestones.map((milestone, index) => (
          <div
            key={index}
            className={`${styles.timelineItem} ${
              index % 2 === 0 ? styles.left : styles.right
            }`}
            ref={(el) => {
              cardsRef.current[index] = el;
            }}
          >
            <div className={styles.dot}>
              <span className={styles.year}>{milestone.year}</span>
            </div>
            <div className={styles.card}>
              <div className={styles.cardImage}>
                <img src={milestone.image} alt={milestone.title} />
              </div>
              <div className={styles.cardContent}>
                <h3>{milestone.title}</h3>
                <p>{milestone.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Milestones;
