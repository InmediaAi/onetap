"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const ACCEPTED = ["image/jpeg", "image/jpg", "image/png"];

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function UploadZone({
  value,
  onChange,
  compact = false,
}: {
  value: string | null;
  onChange: (dataUrl: string) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file?: File) => {
      if (!file) return;
      if (!ACCEPTED.includes(file.type)) {
        setError("Supported formats: jpg, jpeg, png.");
        return;
      }
      setError(null);
      onChange(await readAsDataUrl(file));
    },
    [onChange],
  );

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "relative flex w-full items-center justify-center overflow-hidden border border-dashed border-hairline bg-ivoryPanel transition-colors",
          dragging && "border-stone bg-ivoryDeep",
          compact ? "aspect-square" : "aspect-[3/4]",
        )}
      >
        {value ? (
          <Image
            src={value}
            alt="Your portrait"
            fill
            sizes="320px"
            className="object-cover"
          />
        ) : (
          <div className="px-6 text-center">
            <p className="font-display text-lg">Upload a portrait</p>
            <p className="mt-2 text-xs text-muted">
              Drag & drop or click — jpg, jpeg, png
            </p>
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="btn-ghost w-full"
      >
        {value ? "Replace Image" : "Upload Image"}
      </button>

      {error && <p className="text-xs text-taupe">{error}</p>}
    </div>
  );
}
