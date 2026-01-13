const API_BIBLE_BASE_URL = "https://rest.api.bible/v1";

// Default to BSB (Berean Standard Bible) - modern, accurate translation
export const DEFAULT_BIBLE_ID = "bba9f40183526463-01"; // BSB

interface ApiBibleResponse<T> {
  data: T;
}

interface Bible {
  id: string;
  name: string;
  nameLocal: string;
  abbreviation: string;
  abbreviationLocal: string;
  description: string;
  descriptionLocal: string;
  language: {
    id: string;
    name: string;
    nameLocal: string;
    script: string;
    scriptDirection: string;
  };
}

interface Book {
  id: string;
  bibleId: string;
  abbreviation: string;
  name: string;
  nameLong: string;
}

interface Chapter {
  id: string;
  bibleId: string;
  bookId: string;
  number: string;
  reference: string;
}

interface Verse {
  id: string;
  orgId: string;
  bibleId: string;
  bookId: string;
  chapterId: string;
  reference: string;
}

interface Passage {
  id: string;
  bibleId: string;
  orgId: string;
  content: string;
  reference: string;
  verseCount: number;
  copyright: string;
}

async function apiBibleFetch<T>(endpoint: string, apiKey: string): Promise<T | null> {
  if (!apiKey) {
    console.warn("API.Bible key not provided");
    return null;
  }

  try {
    const response = await fetch(`${API_BIBLE_BASE_URL}${endpoint}`, {
      headers: {
        "api-key": apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API.Bible error ${response.status}:`, errorText);
      throw new Error(`API.Bible error (${response.status}): ${errorText || response.statusText}`);
    }

    const result: ApiBibleResponse<T> = await response.json();
    return result.data;
  } catch (error) {
    console.error("API.Bible fetch error:", error);
    return null;
  }
}

export async function getBibles(apiKey: string): Promise<Bible[] | null> {
  return apiBibleFetch<Bible[]>("/bibles?language=eng", apiKey);
}

export async function getBooks(apiKey: string, bibleId: string = DEFAULT_BIBLE_ID): Promise<Book[] | null> {
  return apiBibleFetch<Book[]>(`/bibles/${bibleId}/books`, apiKey);
}

export async function getChapters(
  apiKey: string,
  bibleId: string = DEFAULT_BIBLE_ID,
  bookId: string
): Promise<Chapter[] | null> {
  return apiBibleFetch<Chapter[]>(`/bibles/${bibleId}/books/${bookId}/chapters`, apiKey);
}

export async function getVerses(
  apiKey: string,
  bibleId: string = DEFAULT_BIBLE_ID,
  chapterId: string
): Promise<Verse[] | null> {
  return apiBibleFetch<Verse[]>(`/bibles/${bibleId}/chapters/${chapterId}/verses`, apiKey);
}

export async function getPassage(
  apiKey: string,
  bibleId: string = DEFAULT_BIBLE_ID,
  passageId: string,
  options: {
    contentType?: "html" | "text" | "json";
    includeNotes?: boolean;
    includeTitles?: boolean;
    includeVerseNumbers?: boolean;
  } = {}
): Promise<Passage | null> {
  const params = new URLSearchParams({
    "content-type": options.contentType || "html",
    "include-notes": String(options.includeNotes ?? false),
    "include-titles": String(options.includeTitles ?? true),
    "include-chapter-numbers": "false",
    "include-verse-numbers": String(options.includeVerseNumbers ?? true),
  });

  return apiBibleFetch<Passage>(`/bibles/${bibleId}/passages/${passageId}?${params}`, apiKey);
}

export async function searchBible(
  apiKey: string,
  bibleId: string = DEFAULT_BIBLE_ID,
  query: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ verses: Verse[]; total: number } | null> {
  const params = new URLSearchParams({
    query,
    limit: String(options.limit || 20),
    offset: String(options.offset || 0),
  });

  return apiBibleFetch<{ verses: Verse[]; total: number }>(
    `/bibles/${bibleId}/search?${params}`,
    apiKey
  );
}

// Helper to convert our book format to API.Bible format
export function getApiBibleBookId(bookAbbreviation: string): string {
  // API.Bible uses 3-letter book codes
  const bookMap: Record<string, string> = {
    Gen: "GEN",
    Exod: "EXO",
    Lev: "LEV",
    Num: "NUM",
    Deut: "DEU",
    Josh: "JOS",
    Judg: "JDG",
    Ruth: "RUT",
    "1Sam": "1SA",
    "2Sam": "2SA",
    "1Kgs": "1KI",
    "2Kgs": "2KI",
    "1Chr": "1CH",
    "2Chr": "2CH",
    Ezra: "EZR",
    Neh: "NEH",
    Esth: "EST",
    Job: "JOB",
    Ps: "PSA",
    Prov: "PRO",
    Eccl: "ECC",
    Song: "SNG",
    Isa: "ISA",
    Jer: "JER",
    Lam: "LAM",
    Ezek: "EZK",
    Dan: "DAN",
    Hos: "HOS",
    Joel: "JOL",
    Amos: "AMO",
    Obad: "OBA",
    Jonah: "JON",
    Mic: "MIC",
    Nah: "NAM",
    Hab: "HAB",
    Zeph: "ZEP",
    Hag: "HAG",
    Zech: "ZEC",
    Mal: "MAL",
    Matt: "MAT",
    Mark: "MRK",
    Luke: "LUK",
    John: "JHN",
    Acts: "ACT",
    Rom: "ROM",
    "1Cor": "1CO",
    "2Cor": "2CO",
    Gal: "GAL",
    Eph: "EPH",
    Phil: "PHP",
    Col: "COL",
    "1Thess": "1TH",
    "2Thess": "2TH",
    "1Tim": "1TI",
    "2Tim": "2TI",
    Titus: "TIT",
    Phlm: "PHM",
    Heb: "HEB",
    Jas: "JAS",
    "1Pet": "1PE",
    "2Pet": "2PE",
    "1John": "1JN",
    "2John": "2JN",
    "3John": "3JN",
    Jude: "JUD",
    Rev: "REV",
  };

  return bookMap[bookAbbreviation] || bookAbbreviation;
}

// Build passage ID from book, chapter, verse range
export function buildPassageId(
  bookAbbreviation: string,
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number
): string {
  const bookId = getApiBibleBookId(bookAbbreviation);

  if (startChapter === endChapter && startVerse === endVerse) {
    // Single verse
    return `${bookId}.${startChapter}.${startVerse}`;
  } else if (startChapter === endChapter) {
    // Verse range within same chapter
    return `${bookId}.${startChapter}.${startVerse}-${bookId}.${endChapter}.${endVerse}`;
  } else {
    // Multi-chapter range
    return `${bookId}.${startChapter}.${startVerse}-${bookId}.${endChapter}.${endVerse}`;
  }
}

export { DEFAULT_BIBLE_ID };
export type { Bible, Book, Chapter, Verse, Passage };
