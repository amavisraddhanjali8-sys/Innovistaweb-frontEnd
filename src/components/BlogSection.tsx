import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import { FiArrowRight } from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import MainHeading from "./MainHeading";
import BlogCard from "./BlogCard";
import {
  DEFAULT_BLOG_POSTS,
  getHomePageBlogs,
  type BlogPostItem,
} from "../utils/blogBloggerHelpers";
import styles from "../cssModules/BlogSection.module.css";

import "swiper/swiper-bundle.css";

function BlogSection() {
  const [homeBlogs, setHomeBlogs] = useState<BlogPostItem[]>(() =>
    getHomePageBlogs(DEFAULT_BLOG_POSTS)
  );

  useEffect(() => {
    let active = true;
    AxiosConfig.get<{ posts?: BlogPostItem[]; data?: BlogPostItem[] }>(
      "/api/blogs",
      {
        params: { homeOnly: true, autoSync: 1 },
      }
    )
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res.data?.posts)
          ? res.data.posts
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        if (list.length > 0) {
          setHomeBlogs(list);
        }
      })
      .catch(() => {
        // Fallback smoothly to curated local blogs
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className={styles.container} aria-label="Featured Home Blogs">
      <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <MainHeading
          heading="Challenges We Conquer, Solutions We Deliver"
          description="Discover curated architectural guides and engineering notes selected for our front-page journal."
        />

        <div className={styles.blogCardsContainer}>
          <Swiper
            key={homeBlogs.map((b) => b.id).join("-")}
            modules={[Autoplay, Pagination]}
            spaceBetween={24}
            slidesPerView={Math.min(3, Math.max(1, homeBlogs.length))}
            pagination={{
              clickable: true,
              dynamicBullets: false,
            }}
            autoplay={{ delay: 7500, pauseOnMouseEnter: true }}
            breakpoints={{
              0: { slidesPerView: 1, spaceBetween: 16 },
              640: {
                slidesPerView: Math.min(2, Math.max(1, homeBlogs.length)),
                spaceBetween: 20,
              },
              1024: {
                slidesPerView: Math.min(3, Math.max(1, homeBlogs.length)),
                spaceBetween: 24,
              },
            }}
          >
            {homeBlogs.map((blog, idx) => (
              <SwiperSlide key={blog.id}>
                <BlogCard blog={blog} index={idx} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            to="/blogs"
            className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] text-xs sm:text-sm font-semibold text-[#22577A] no-underline transition-colors shadow-xs"
          >
            <span>Explore Full Architectural Journal</span>
            <FiArrowRight className="text-sm" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default BlogSection;
