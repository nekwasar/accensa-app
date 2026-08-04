"use client";

import React, { useState } from 'react';
import { FaqItem } from './faq-item';

export interface FaqData {
  question: string;
  answer: string;
}

export function FaqAccordion({ items }: { items: FaqData[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleClick = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <FaqItem
          key={index}
          question={item.question}
          answer={item.answer}
          isOpen={openIndex === index}
          onClick={() => handleClick(index)}
        />
      ))}
    </div>
  );
}
