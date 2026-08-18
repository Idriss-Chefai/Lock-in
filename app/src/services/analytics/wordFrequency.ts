const STOPWORDS = new Set([
  "the","a","an","and","or","but","is","are","was","were","to","of","in","on","for","with","it","this","that","i","my","me","be","as","at","by","we","you","your","our","us","into","out","up","down","from","they","them","their","he","she","his","her","him","itself","herself","himself"
]);

export function wordFrequency(texts: string[], topN = 30): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
    for (const word of words) {
      if (word.length < 3 || STOPWORDS.has(word)) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}
