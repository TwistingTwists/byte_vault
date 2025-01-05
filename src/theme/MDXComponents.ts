import React from 'react';
// Importing the original mapper + our components according to the Docusaurus doc
import MDXComponents from '@theme-original/MDXComponents';
import QuestionSolution from '../components/QuestionSolution';
import LineBreakReplacer from '../components/LineBreakReplacer';
// import Card from '@site/src/components/Card';
// import CardBody from '@site/src/components/Card/CardBody';
// import CardFooter from '@site/src/components/Card/CardFooter';
// import CardHeader from '@site/src/components/Card/CardHeader';
// import CardImage from '@site/src/components/Card/CardImage';
export default {
  // Reusing the default mapping
  ...MDXComponents,
//   Card, 
//   CardHeader, 
//   CardBody, 
//   CardFooter, 
//   CardImage,
    QuestionSolution,
    // LineBreakReplacer
};