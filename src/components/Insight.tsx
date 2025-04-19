import React from "react";

interface InsightProps {
  children: React.ReactNode;
}

const Insight: React.FC<InsightProps> = ({ children }) => (
  <div className="bg-orange-100 dark:bg-orange-900 p-6 rounded-xl mt-8 mb-4 border-l-4 border-orange-400 dark:border-orange-500 shadow-sm">
    <span className="block font-bold text-lg text-orange-900 dark:text-orange-200 mb-2">Insight</span>
    <span className="text-base text-gray-900 dark:text-gray-100">{children}</span>
  </div>
);

export default Insight;
