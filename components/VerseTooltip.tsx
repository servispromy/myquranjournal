import React from 'react';
import ReactMarkdown from 'react-markdown';

// This component was previously used to create interactive tooltips for verse citations.
// It has been re-engineered to simply render the AI-generated markdown text,
// which includes bolded citations, effectively acting as a 'highlight' without the hover effect.
const VerseTooltip: React.FC<{ children: string | undefined }> = ({ children }) => {
    if (!children) return null;
    return <ReactMarkdown>{children}</ReactMarkdown>;
};

export default VerseTooltip;
