import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BLOGGER_COVER_FALLBACKS,
  type BlogPostItem,
} from "../utils/blogBloggerHelpers";
import styles from "../cssModules/BlogCard.module.css";

type Props = {
  blog: BlogPostItem;
  index?: number;
};

const BlogCard = ({ blog, index = 0 }: Props) => {
  const fallback =
    BLOGGER_COVER_FALLBACKS[index % BLOGGER_COVER_FALLBACKS.length];
  const [imgSrc, setImgSrc] = useState(blog.coverImage || fallback);

  useEffect(() => {
    setImgSrc(blog.coverImage || fallback);
  }, [blog.coverImage, fallback]);

  return (
    <Link
      to={`/blogs?post=${encodeURIComponent(blog.id)}`}
      className={styles.card}
    >
      <div className={styles.imageWrapper}>
        <img
          src={imgSrc}
          alt={blog.title}
          referrerPolicy="no-referrer"
          loading="eager"
          decoding="async"
          onError={() => {
            if (imgSrc !== fallback) setImgSrc(fallback);
          }}
          className={styles.image}
        />
        <div className={styles.overlay} />
      </div>
      <div className={styles.content}>
        <div className={styles.metaLine}>
          <span>{blog.category}</span>
          <span aria-hidden="true">·</span>
          <span>{blog.date}</span>
          {blog.source === "blogger" && (
            <>
              <span aria-hidden="true">·</span>
              <span className={styles.bloggerSource}>Blogger</span>
            </>
          )}
        </div>
        <h3 className={styles.title}>{blog.title}</h3>
        <p className={styles.excerpt}>{blog.excerpt}</p>
        <span className={styles.readMore}>
          Read Article
          <svg
            className={styles.arrow}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
};

export default BlogCard;
