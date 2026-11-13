import React, { useState } from "react";
import { Modal } from "antd";
import { FiChevronLeft, FiChevronRight, FiMaximize2 } from "react-icons/fi";

interface SafeImageProps {
  src?: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  className?: string;
  preview?: boolean;
}

/**
 * Lightweight image thumbnail + modal preview without rc-image's cross-origin
 * window.top listener (prevents SecurityError inside cross-origin iframes).
 */
export function SafeImage({
  src,
  alt = "Image preview",
  width,
  height,
  style,
  className = "",
  preview = true,
}: SafeImageProps) {
  const [open, setOpen] = useState(false);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src) return null;

  const fallbackSrc = "/assets/products/door.jpg";
  const resolvedSrc = failedSrc === src ? fallbackSrc : src;
  const Wrapper: React.ElementType = preview ? "button" : "span";

  return (
    <>
      <Wrapper
        {...(preview
          ? {
              type: "button" as const,
              "aria-label": `Preview ${alt}`,
              onClick: () => setOpen(true),
            }
          : {})}
        className={`relative inline-block overflow-hidden group align-middle border-0 bg-transparent p-0 ${
          preview ? "cursor-pointer" : ""
        }`}
        style={{ width, height, borderRadius: style?.borderRadius }}
      >
        <img
          src={resolvedSrc}
          alt={alt}
          onError={() => {
            if (resolvedSrc !== fallbackSrc) setFailedSrc(src);
          }}
          style={{
            width: width ?? "100%",
            height: height ?? "auto",
            objectFit: "cover",
            display: "block",
            ...style,
          }}
          className={className}
        />
        {preview && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-slate-900/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
          >
            <FiMaximize2 className="text-xs" />
          </span>
        )}
      </Wrapper>

      {preview && (
        <Modal
          open={open}
          onCancel={() => setOpen(false)}
          footer={null}
          centered
          width={760}
          title={
            <span className="text-sm font-semibold text-slate-800">{alt}</span>
          }
        >
          <div className="flex items-center justify-center bg-slate-50 rounded-xl p-2">
            <img
              src={resolvedSrc}
              alt={alt}
              className="max-h-[70vh] w-auto object-contain rounded-lg"
            />
          </div>
        </Modal>
      )}
    </>
  );
}

interface SafeImageGalleryModalProps {
  images: string[];
  open: boolean;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  title?: string;
}

export function SafeImageGalleryModal({
  images,
  open,
  currentIndex,
  onIndexChange,
  onClose,
  title = "Project Gallery",
}: SafeImageGalleryModalProps) {
  const safeImages = images.filter(Boolean);
  const activeSrc = safeImages[currentIndex] || safeImages[0];

  const handlePrev = () => {
    if (safeImages.length <= 1) return;
    onIndexChange((currentIndex - 1 + safeImages.length) % safeImages.length);
  };

  const handleNext = () => {
    if (safeImages.length <= 1) return;
    onIndexChange((currentIndex + 1) % safeImages.length);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={860}
      title={
        <div className="flex items-center justify-between pr-6">
          <span className="text-sm font-semibold text-slate-900">{title}</span>
          {safeImages.length > 0 && (
            <span className="text-xs text-slate-500 tabular-nums">
              {currentIndex + 1} / {safeImages.length}
            </span>
          )}
        </div>
      }
    >
      {activeSrc && (
        <div className="space-y-3">
          <div className="relative flex items-center justify-center bg-slate-900/95 rounded-xl overflow-hidden min-h-[320px] max-h-[68vh]">
            <img
              src={activeSrc}
              alt={`${title} ${currentIndex + 1}`}
              className="max-h-[68vh] w-auto object-contain"
            />

            {safeImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous image"
                  className="absolute left-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-900 flex items-center justify-center shadow-md cursor-pointer"
                >
                  <FiChevronLeft />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next image"
                  className="absolute right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-900 flex items-center justify-center shadow-md cursor-pointer"
                >
                  <FiChevronRight />
                </button>
              </>
            )}
          </div>

          {safeImages.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {safeImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onIndexChange(idx)}
                  className={`shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    idx === currentIndex
                      ? "border-[#22577A] opacity-100"
                      : "border-transparent opacity-65 hover:opacity-100"
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-16 h-12 object-cover block"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default SafeImage;
