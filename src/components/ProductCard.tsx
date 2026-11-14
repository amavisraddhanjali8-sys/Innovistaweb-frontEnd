import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App as AntdApp } from "antd";
import gsap from "gsap";
import { useAuth } from "../Context/AuthContext";
import { buildSignupRedirectUrl } from "../utils/authHelpers";
import styles from "../cssModules/ProductCard.module.css";
import RequestQuoteModal from "./RequestQuoteModal";
import TactileActionButton from "./TactileActionButton";

type Props = {
  id: string;
  image: string;
  title: string;
  description: string;
};

function ProductCard({ id, image, title, description }: Props) {
  const { message } = AntdApp.useApp();
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const img = imageRef.current;
    const titleEl = titleRef.current;
    const descEl = descRef.current;
    const buttons = buttonsRef.current;

    gsap.fromTo(
      card,
      {
        opacity: 0,
        y: 50,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power3.out",
      }
    );

    gsap.fromTo(
      img,
      {
        scale: 1.2,
        opacity: 0,
      },
      {
        scale: 1,
        opacity: 1,
        duration: 1,
        ease: "power2.out",
        delay: 0.2,
      }
    );

    gsap.fromTo(
      [titleEl, descEl],
      {
        opacity: 0,
        y: 20,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: "power2.out",
        delay: 0.4,
      }
    );

    gsap.fromTo(
      buttons?.children || [],
      {
        opacity: 0,
        scale: 0.8,
      },
      {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        stagger: 0.1,
        ease: "back.out(1.7)",
        delay: 0.7,
      }
    );

    const handleMouseEnter = () => {
      gsap.to(img, {
        scale: 1.1,
        duration: 0.6,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      gsap.to(img, {
        scale: 1,
        duration: 0.6,
        ease: "power2.out",
      });
    };

    card?.addEventListener("mouseenter", handleMouseEnter);
    card?.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      card?.removeEventListener("mouseenter", handleMouseEnter);
      card?.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    
    gsap.to(button, {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: "power2.inOut",
    });
  };

  return (
    <div className={styles.cardContainer} ref={cardRef} key={id}>
      <img
        ref={imageRef}
        src={image}
        alt={title}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={styles.image}
      />
      <div className={styles.content}>
        <h2 ref={titleRef} className={styles.title}>
          {title}
        </h2>
        <p ref={descRef} className={styles.description}>
          {description}
        </p>
      </div>
      <div ref={buttonsRef} className={styles.buttonContainer}>
        <TactileActionButton
          tone="azure"
          size="sm"
          fullWidth
          frameClassName="flex-1"
          className="cursor-target"
          onClick={(e) => {
            handleButtonClick(e);
            if (!isLoggedIn) {
              message.info("Please create a customer account to request a quotation.");
              navigate(
                buildSignupRedirectUrl(
                  `${location.pathname}${location.search}`,
                  "quote"
                )
              );
              return;
            }
            setQuoteModalOpen(true);
          }}
        >
          Request Quote
        </TactileActionButton>
        <TactileActionButton
          tone="pearl"
          size="sm"
          fullWidth
          frameClassName="flex-1"
          className="cursor-target"
          onClick={(e) => {
            handleButtonClick(e);
            navigate(id ? `/products/${encodeURIComponent(id)}` : "/products");
          }}
        >
          View More
        </TactileActionButton>
      </div>
      <RequestQuoteModal
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        productId={id}
        productName={title}
      />
    </div>
  );
}

export default ProductCard;