
/**
 * Transforms casual text into formal business language
 */
export const formalizeText = (text: string): string => {
  if (!text || text.trim() === '') return text;

  // Common casual to formal replacements
  const replacements: Record<string, string> = {
    // Contractions
    "can't": "cannot",
    "won't": "will not",
    "don't": "do not",
    "didn't": "did not",
    "haven't": "have not",
    "hasn't": "has not",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
    "I'm": "I am",
    "you're": "you are",
    "we're": "we are",
    "they're": "they are",
    "it's": "it is",
    "that's": "that is",
    "here's": "here is",
    "there's": "there is",
    "we've": "we have",
    "they've": "they have",
    "I've": "I have",
    "you've": "you have",
    
    // Casual words to formal
    "ok": "acceptable",
    "okay": "acceptable",
    "thanks": "thank you",
    "hi": "greetings",
    "bye": "goodbye",
    "asap": "as soon as possible",
    "fyi": "for your information",
    "btw": "incidentally",
    "etc": "and so forth",
    "gonna": "going to",
    "wanna": "want to",
    "gotta": "have to",
    "kinda": "somewhat",
    "sorta": "somewhat",
    
    // Business improvements
    "get": "receive",
    "got": "received",
    "give": "provide",
    "gave": "provided",
    "ask": "request",
    "asked": "requested",
    "tell": "inform",
    "told": "informed",
    "show": "demonstrate",
    "showed": "demonstrated",
    "help": "assist",
    "helped": "assisted",
    "fix": "resolve",
    "fixed": "resolved",
    "buy": "purchase",
    "bought": "purchased",
    "sell": "offer",
    "sold": "provided"
  };

  let formalizedText = text;

  // Apply replacements (case-insensitive for whole words only)
  Object.entries(replacements).forEach(([casual, formal]) => {
    const regex = new RegExp(`\\b${casual}\\b`, 'gi');
    formalizedText = formalizedText.replace(regex, formal);
  });

  // Capitalize first letter of sentences
  formalizedText = formalizedText.replace(/(^|\. )([a-z])/g, (match, prefix, letter) => {
    return prefix + letter.toUpperCase();
  });

  // Ensure proper sentence ending
  formalizedText = formalizedText.trim();
  if (!formalizedText.endsWith('.') && !formalizedText.endsWith('!') && !formalizedText.endsWith('?')) {
    formalizedText += '.';
  }

  return formalizedText;
};

/**
 * Enhances text with more professional language and structure
 */
export const enhanceForBusiness = (text: string): string => {
  if (!text || text.trim() === '') return text;

  let enhanced = formalizeText(text);

  // Add professional opening phrases if the text seems too direct
  if (!enhanced.toLowerCase().includes('we are') && !enhanced.toLowerCase().includes('we would like') && !enhanced.toLowerCase().includes('please')) {
    if (enhanced.toLowerCase().startsWith('our') || enhanced.toLowerCase().startsWith('the')) {
      enhanced = `We would like to inform you that ${enhanced.charAt(0).toLowerCase() + enhanced.slice(1)}`;
    }
  }

  // Ensure polite language
  if (enhanced.toLowerCase().includes('you must') || enhanced.toLowerCase().includes('you have to')) {
    enhanced = enhanced.replace(/you must/gi, 'we kindly request that you');
    enhanced = enhanced.replace(/you have to/gi, 'we would appreciate if you could');
  }

  return enhanced;
};
