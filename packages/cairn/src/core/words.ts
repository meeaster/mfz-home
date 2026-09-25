const stopwords = new Set(["the", "and", "for", "with", "into", "from", "via", "on", "in", "of", "to", "an", "at", "by", "is"]);

const suffixes: readonly string[] = ["ing", "ed", "es", "s", "e"];

// A crude stem, so "archiving", "archived", and "archive" compare equal.
function stem(word: string): string {
  let stemmed = word;

  for (const suffix of suffixes) {
    if (stemmed.endsWith(suffix) && !stemmed.endsWith("ss") && stemmed.length - suffix.length >= 3) {
      stemmed = stemmed.slice(0, -suffix.length);
    }
  }

  return stemmed;
}

// The stems of a text's words, without stopwords and single characters.
export function significantWords(value: string): Set<string> {
  const words = new Set<string>();

  for (const word of value.toLowerCase().split(/[^a-z0-9]+/)) {
    if (word.length > 1 && !stopwords.has(word)) {
      words.add(stem(word));
    }
  }

  return words;
}
