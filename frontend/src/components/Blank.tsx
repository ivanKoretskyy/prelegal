"use client";

import { useEffect, useRef, useState } from "react";

export function Blank({ value, label }: { value: string; label: string }) {
  const filled = value.trim().length > 0;
  const [justFilled, setJustFilled] = useState(false);
  const wasFilled = useRef(false);

  useEffect(() => {
    if (filled && !wasFilled.current) {
      setJustFilled(true);
      const timeout = setTimeout(() => setJustFilled(false), 500);
      wasFilled.current = filled;
      return () => clearTimeout(timeout);
    }
    wasFilled.current = filled;
  }, [filled]);

  if (!filled) {
    return (
      <span className="whitespace-nowrap border-b border-dashed border-blank-border text-blank-text">
        {label}
      </span>
    );
  }

  return (
    <span className="blank-stamp rounded-[2px]" data-filled={justFilled}>
      {value}
    </span>
  );
}
