import React, { useId, useState } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
}

export default function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const show = () => setVisible(true);
  const hide = () => setVisible(false);
  return (
    <span
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {React.cloneElement(children, { 'aria-describedby': id })}
      {visible && (
        <span
          role="tooltip"
          id={id}
          className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 rounded bg-black px-2 py-1 text-xs text-white shadow"
        >
          {content}
        </span>
      )}
    </span>
  );
}
