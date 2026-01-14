/**
 * Parser for custom Bible text pasted from external sources
 *
 * Expected format: "[Phl 2:1-11 ESV] 1 So if there is any encouragement..."
 *
 * The header format is: [BookAbbrev Chapter:StartVerse-EndVerse Version]
 * Verses are numbered inline: "1 text... 2 text..."
 */

export type ParsedBiblePassage = {
  bookAbbreviation: string;
  bookName: string | null;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
  versionName: string;
  verses: { number: number; text: string }[];
  htmlContent: string;
  rawText: string;
};

// Book abbreviation mappings (common formats)
const BOOK_MAPPINGS: Record<string, string> = {
  // Old Testament
  "gen": "Genesis", "ge": "Genesis", "gn": "Genesis",
  "exod": "Exodus", "exo": "Exodus", "ex": "Exodus",
  "lev": "Leviticus", "le": "Leviticus", "lv": "Leviticus",
  "num": "Numbers", "nu": "Numbers", "nm": "Numbers",
  "deut": "Deuteronomy", "deu": "Deuteronomy", "dt": "Deuteronomy",
  "josh": "Joshua", "jos": "Joshua", "jsh": "Joshua",
  "judg": "Judges", "jdg": "Judges", "jg": "Judges",
  "ruth": "Ruth", "rth": "Ruth", "ru": "Ruth",
  "1sam": "1 Samuel", "1sa": "1 Samuel", "1sm": "1 Samuel",
  "2sam": "2 Samuel", "2sa": "2 Samuel", "2sm": "2 Samuel",
  "1kgs": "1 Kings", "1ki": "1 Kings", "1kg": "1 Kings",
  "2kgs": "2 Kings", "2ki": "2 Kings", "2kg": "2 Kings",
  "1chr": "1 Chronicles", "1ch": "1 Chronicles",
  "2chr": "2 Chronicles", "2ch": "2 Chronicles",
  "ezra": "Ezra", "ezr": "Ezra",
  "neh": "Nehemiah", "ne": "Nehemiah",
  "esth": "Esther", "est": "Esther", "es": "Esther",
  "job": "Job", "jb": "Job",
  "ps": "Psalms", "psa": "Psalms", "psm": "Psalms", "pss": "Psalms",
  "prov": "Proverbs", "pro": "Proverbs", "pr": "Proverbs",
  "eccl": "Ecclesiastes", "ecc": "Ecclesiastes", "ec": "Ecclesiastes",
  "song": "Song of Solomon", "sos": "Song of Solomon", "ss": "Song of Solomon",
  "isa": "Isaiah", "is": "Isaiah",
  "jer": "Jeremiah", "je": "Jeremiah",
  "lam": "Lamentations", "la": "Lamentations",
  "ezek": "Ezekiel", "eze": "Ezekiel", "ezk": "Ezekiel",
  "dan": "Daniel", "da": "Daniel", "dn": "Daniel",
  "hos": "Hosea", "ho": "Hosea",
  "joel": "Joel", "jl": "Joel",
  "amos": "Amos", "am": "Amos",
  "obad": "Obadiah", "ob": "Obadiah",
  "jonah": "Jonah", "jon": "Jonah",
  "mic": "Micah", "mi": "Micah",
  "nah": "Nahum", "na": "Nahum",
  "hab": "Habakkuk", "hb": "Habakkuk",
  "zeph": "Zephaniah", "zep": "Zephaniah",
  "hag": "Haggai", "hg": "Haggai",
  "zech": "Zechariah", "zec": "Zechariah",
  "mal": "Malachi", "ml": "Malachi",
  // New Testament
  "matt": "Matthew", "mat": "Matthew", "mt": "Matthew",
  "mark": "Mark", "mrk": "Mark", "mk": "Mark",
  "luke": "Luke", "luk": "Luke", "lk": "Luke",
  "john": "John", "joh": "John", "jn": "John",
  "acts": "Acts", "act": "Acts", "ac": "Acts",
  "rom": "Romans", "ro": "Romans", "rm": "Romans",
  "1cor": "1 Corinthians", "1co": "1 Corinthians",
  "2cor": "2 Corinthians", "2co": "2 Corinthians",
  "gal": "Galatians", "ga": "Galatians",
  "eph": "Ephesians", "ep": "Ephesians",
  "phil": "Philippians", "php": "Philippians", "phl": "Philippians",
  "col": "Colossians", "co": "Colossians",
  "1thess": "1 Thessalonians", "1th": "1 Thessalonians", "1thes": "1 Thessalonians",
  "2thess": "2 Thessalonians", "2th": "2 Thessalonians", "2thes": "2 Thessalonians",
  "1tim": "1 Timothy", "1ti": "1 Timothy",
  "2tim": "2 Timothy", "2ti": "2 Timothy",
  "titus": "Titus", "tit": "Titus",
  "phlm": "Philemon", "phm": "Philemon",
  "heb": "Hebrews", "he": "Hebrews",
  "james": "James", "jas": "James", "jm": "James",
  "1pet": "1 Peter", "1pe": "1 Peter", "1pt": "1 Peter",
  "2pet": "2 Peter", "2pe": "2 Peter", "2pt": "2 Peter",
  "1john": "1 John", "1jn": "1 John", "1jo": "1 John",
  "2john": "2 John", "2jn": "2 John", "2jo": "2 John",
  "3john": "3 John", "3jn": "3 John", "3jo": "3 John",
  "jude": "Jude", "jud": "Jude",
  "rev": "Revelation", "re": "Revelation",
};

function getBookName(abbreviation: string): string | null {
  const normalized = abbreviation.toLowerCase().replace(/\s/g, "");
  return BOOK_MAPPINGS[normalized] || null;
}

/**
 * Parse the header portion of the pasted text
 * Format: [BookAbbrev Chapter:StartVerse-EndVerse Version]
 * Examples:
 *   [Phl 2:1-11 ESV]
 *   [John 3:16 NIV]
 *   [Gen 1:1-2:3 KJV]
 */
function parseHeader(header: string): {
  bookAbbreviation: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
  versionName: string;
} | null {
  // Remove brackets
  const inner = header.replace(/^\[|\]$/g, "").trim();

  // Try different regex patterns for various formats
  // Pattern 1: "Book Chapter:Verse-Verse Version" (e.g., "Phl 2:1-11 ESV")
  // Pattern 2: "Book Chapter:Verse-Chapter:Verse Version" (e.g., "Gen 1:1-2:3 ESV")
  // Pattern 3: "Book Chapter:Verse Version" (e.g., "John 3:16 NIV")

  // Try multi-chapter format first: Book Chapter:Verse-Chapter:Verse Version
  let match = inner.match(/^(\d?\s*\w+)\s+(\d+):(\d+)-(\d+):(\d+)\s+(\w+)$/i);
  if (match) {
    return {
      bookAbbreviation: match[1].trim(),
      startChapter: parseInt(match[2], 10),
      startVerse: parseInt(match[3], 10),
      endChapter: parseInt(match[4], 10),
      endVerse: parseInt(match[5], 10),
      versionName: match[6].trim(),
    };
  }

  // Try single chapter with range: Book Chapter:Verse-Verse Version
  match = inner.match(/^(\d?\s*\w+)\s+(\d+):(\d+)-(\d+)\s+(\w+)$/i);
  if (match) {
    const chapter = parseInt(match[2], 10);
    return {
      bookAbbreviation: match[1].trim(),
      startChapter: chapter,
      startVerse: parseInt(match[3], 10),
      endChapter: chapter,
      endVerse: parseInt(match[4], 10),
      versionName: match[5].trim(),
    };
  }

  // Try single verse: Book Chapter:Verse Version
  match = inner.match(/^(\d?\s*\w+)\s+(\d+):(\d+)\s+(\w+)$/i);
  if (match) {
    const chapter = parseInt(match[2], 10);
    const verse = parseInt(match[3], 10);
    return {
      bookAbbreviation: match[1].trim(),
      startChapter: chapter,
      startVerse: verse,
      endChapter: chapter,
      endVerse: verse,
      versionName: match[4].trim(),
    };
  }

  return null;
}

/**
 * Parse the verse content from the pasted text
 * Verses are numbered inline: "1 text... 2 text..."
 */
function parseVerses(content: string, startVerse: number): { number: number; text: string }[] {
  const verses: { number: number; text: string }[] = [];

  // Split by verse numbers - look for numbers followed by text
  // The regex finds verse numbers (with optional space after) followed by verse text
  const verseRegex = /(\d+)\s+/g;
  const matches = [...content.matchAll(verseRegex)];

  if (matches.length === 0) {
    // No verse numbers found, treat entire content as single verse
    return [{ number: startVerse, text: content.trim() }];
  }

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const verseNum = parseInt(match[1], 10);
    const startIndex = match.index! + match[0].length;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index! : content.length;
    const verseText = content.slice(startIndex, endIndex).trim();

    if (verseText) {
      verses.push({ number: verseNum, text: verseText });
    }
  }

  return verses;
}

/**
 * Convert parsed verses to HTML format similar to API.Bible
 */
function versesToHtml(verses: { number: number; text: string }[], bookAbbrev: string, chapter: number): string {
  const paragraphs = verses.map(verse => {
    const vid = `${bookAbbrev}.${chapter}.${verse.number}`;
    return `<span data-vid="${vid}"><span class="v">${verse.number}</span> ${escapeHtml(verse.text)} </span>`;
  });

  return `<p class="p">${paragraphs.join("")}</p>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Main parser function
 *
 * @param rawText - The raw pasted text in format: "[Phl 2:1-11 ESV] 1 text 2 text..."
 * @returns Parsed passage data or null if parsing fails
 */
export function parseCustomBibleText(rawText: string): ParsedBiblePassage | null {
  const trimmed = rawText.trim();

  // Find the header portion in brackets
  const headerMatch = trimmed.match(/^\[([^\]]+)\]/);
  if (!headerMatch) {
    return null;
  }

  const headerParsed = parseHeader(headerMatch[0]);
  if (!headerParsed) {
    return null;
  }

  // Get the content after the header
  const content = trimmed.slice(headerMatch[0].length).trim();
  if (!content) {
    return null;
  }

  // Parse the verses
  const verses = parseVerses(content, headerParsed.startVerse);
  if (verses.length === 0) {
    return null;
  }

  // Get the full book name
  const bookName = getBookName(headerParsed.bookAbbreviation);

  // Generate HTML content
  const htmlContent = versesToHtml(verses, headerParsed.bookAbbreviation, headerParsed.startChapter);

  return {
    bookAbbreviation: headerParsed.bookAbbreviation,
    bookName,
    startChapter: headerParsed.startChapter,
    startVerse: headerParsed.startVerse,
    endChapter: headerParsed.endChapter,
    endVerse: headerParsed.endVerse,
    versionName: headerParsed.versionName,
    verses,
    htmlContent,
    rawText: trimmed,
  };
}

/**
 * Validate that a parsed passage matches the expected assignment passage
 */
export function validatePassageMatch(
  parsed: ParsedBiblePassage,
  expectedBookAbbrev: string,
  expectedStartChapter: number,
  expectedStartVerse: number,
  expectedEndChapter: number,
  expectedEndVerse: number
): { valid: boolean; message?: string } {
  // Normalize abbreviations for comparison
  const normalizedParsed = parsed.bookAbbreviation.toLowerCase().replace(/\s/g, "");
  const normalizedExpected = expectedBookAbbrev.toLowerCase().replace(/\s/g, "");

  // Check if the book names map to the same book
  const parsedBookName = getBookName(normalizedParsed);
  const expectedBookName = getBookName(normalizedExpected);

  if (parsedBookName && expectedBookName && parsedBookName !== expectedBookName) {
    return {
      valid: false,
      message: `Book mismatch: pasted ${parsedBookName}, expected ${expectedBookName}`
    };
  }

  // Check if chapters match
  if (parsed.startChapter !== expectedStartChapter) {
    return {
      valid: false,
      message: `Chapter mismatch: pasted chapter ${parsed.startChapter}, expected ${expectedStartChapter}`
    };
  }

  // Verse ranges don't have to match exactly, but the pasted range should cover the assignment
  // This allows users to paste a slightly larger passage if needed

  return { valid: true };
}
