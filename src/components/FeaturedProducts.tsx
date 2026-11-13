import React from "react";
import ProductCard from "./ProductCard";
import MainHeading from "./MainHeading";
import doorImage from "../assets/Images/Product/Door.jpg";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function FeaturedProducts() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const headingRef = React.useRef<HTMLDivElement>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const cardsRef = React.useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(() => {
    if (!gridRef.current) return;

    const validCards = cardsRef.current.filter((card) => card !== null);

    if (validCards.length === 0) return;

    if (headingRef.current) {
      gsap.fromTo(
        headingRef.current,
        {
          opacity: 0,
          y: 30,
        },
        {
          opacity: 1,
          y: 0,
          duration: 1.5,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headingRef.current,
            start: "top 60%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }

    const sm = gsap.matchMedia();
    sm.add("(max-width: 768px)", () => {
      validCards.forEach((card, index) => {
        gsap.fromTo(
          card,
          {
            opacity: 0,
            y: 28,
            scale: 0.96,
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.55,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: `top ${85 - Math.min(index, 3) * 4}%`,
              toggleActions: "play none none reverse",
            },
          }
        );
      });
    });

    sm.add("(min-width: 769px)", () => {
      validCards.forEach((card, index) => {
        gsap.fromTo(
          card,
          {
            opacity: 0,
            y: 80,
            scale: 0.9,
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: `top ${80 - index * 5}%`,
              toggleActions: "play none none reverse",
            },
          }
        );
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
      sm.revert();
    };
  }, []);

  const addCardRef = (el: HTMLDivElement | null, index: number) => {
    cardsRef.current[index] = el;
  };

  return (
    <section
      ref={containerRef}
      className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 my-12 sm:my-20 overflow-x-hidden"
    >
      <div ref={headingRef}>
        <MainHeading
          heading="Our Top Picks"
          description="Explore signature thermally broken aluminium doors, acoustic partitions, and architectural glazing systems."
        />
      </div>

      <div
        ref={gridRef}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10"
      >
        {[
          {
            id: "1",
            title: "Aluminium Sliding Door",
            description:
              "Slim-line 22mm interlocking stiles engineered with dual stainless bogie rollers and recessed drainage.",
          },
          {
            id: "2",
            title: "Thermal Break Casement Window",
            description:
              "Multipoint European locking hardware with PA66 polyamide thermal insulation for coastal villas.",
          },
          {
            id: "3",
            title: "Acoustic Office Partition",
            description:
              "44 dB laminated safety glass framing in brushed anodized or matte charcoal perimeter channels.",
          },
          {
            id: "4",
            title: "Bi-Fold Panorama Door",
            description:
              "Flush threshold folding sashes allowing uninterrupted indoor-outdoor pavilion entertaining.",
          },
          {
            id: "5",
            title: "Structural Curtain Wall",
            description:
              "Solar-control double-glazed facade grid tested for high-wind commercial towers.",
          },
          {
            id: "6",
            title: "Frameless Terrace Balustrade",
            description:
              "Certified U-channel base-shoe aluminium anchoring with 10+10mm laminated SGP safety glass.",
          },
        ].map((item, index) => (
          <div
            key={item.id}
            ref={(el) => addCardRef(el, index)}
            className="flex justify-center"
          >
            <ProductCard
              id={item.id}
              image={doorImage}
              title={item.title}
              description={item.description}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default FeaturedProducts;
