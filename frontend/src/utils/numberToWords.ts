
/**
 * Converts a number to words representation
 * @param num The number to convert to words
 * @returns The number expressed in words
 */
export function numberToWords(num: number): string {
  const specialNames = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion'];
  const tensNames = ['', 'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const onesNames = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];

  // Handles decimals by splitting the number into whole and decimal parts
  const handleDecimals = (n: number): string => {
    const numStr = n.toFixed(2);
    const parts = numStr.split('.');
    const wholeStr = convertNumberToWords(parseInt(parts[0]));
    
    // If there are meaningful decimals (not just .00)
    if (parts.length > 1 && parseInt(parts[1]) > 0) {
      // Format the decimal part as cents
      return `${wholeStr} and ${parts[1]}/100`;
    }
    return wholeStr;
  };

  // Core conversion function for whole numbers
  const convertNumberToWords = (n: number): string => {
    // Handle zero
    if (n === 0) return 'zero';
    
    // Handle negative numbers
    if (n < 0) return `negative ${convertNumberToWords(Math.abs(n))}`;
    
    let result = '';
    let numIndex = 0;
    
    // Process the number in chunks of three digits
    while (n > 0) {
      if (n % 1000 !== 0) {
        result = `${convertLessThanOneThousand(n % 1000)} ${specialNames[numIndex]} ${result}`;
      }
      n = Math.floor(n / 1000);
      numIndex++;
    }
    
    return result.trim();
  };

  // Converts a number less than 1000 to words
  const convertLessThanOneThousand = (n: number): string => {
    if (n === 0) return '';
    
    let result = '';
    
    // Handle hundreds
    if (n >= 100) {
      result = `${onesNames[Math.floor(n / 100)]} hundred `;
      n %= 100;
      if (n === 0) return result.trim();
    }
    
    // Handle tens and ones places
    if (n < 20) {
      // For numbers less than 20, use the direct name
      result += onesNames[n];
    } else {
      // For numbers 20 and above, combine tens and ones names
      result += `${tensNames[Math.floor(n / 10)]}`;
      if (n % 10 > 0) {
        result += `-${onesNames[n % 10]}`;
      }
    }
    
    return result.trim();
  };

  // Start the conversion process
  return handleDecimals(num).trim().charAt(0).toUpperCase() + handleDecimals(num).trim().slice(1);
}
