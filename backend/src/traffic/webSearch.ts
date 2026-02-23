type WebSearchItem = {
  title: string;
  url: string;
  snippet: string;
  source: string;
};

type DuckResponse = {
  AbstractText?: string;
  AbstractURL?: string;
  Heading?: string;
  RelatedTopics?: Array<
    | {
        FirstURL?: string;
        Text?: string;
      }
    | {
        Name?: string;
        Topics?: Array<{
          FirstURL?: string;
          Text?: string;
        }>;
      }
  >;
};

type WikiOpenSearchResponse = [string, string[], string[], string[]];

const clean = (value: string) => value.replace(/\s+/g, " ").trim();

const toDuckUrl = (query: string) =>
  `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&no_redirect=1`;
const toWikiUrl = (query: string) =>
  `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=8&namespace=0&format=json`;

const fetchWithTimeout = async (url: string, ms: number): Promise<Response | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const tryParseJson = <T>(raw: string): T | null => {
  const normalized = raw.replace(/^\uFEFF/, "").trim();
  if (!normalized) return null;
  try {
    return JSON.parse(normalized) as T;
  } catch {
    return null;
  }
};

export const searchWeb = async (query: string): Promise<WebSearchItem[]> => {
  const normalized = clean(query);
  if (!normalized) return [];

  const items: WebSearchItem[] = [];

  const duckResponse = await fetchWithTimeout(toDuckUrl(normalized), 7000);
  if (duckResponse?.ok) {
    const raw = await duckResponse.text();
    const body = tryParseJson<DuckResponse>(raw);
    if (body) {
      if (body.AbstractText && body.AbstractURL) {
        items.push({
          title: clean(body.Heading || normalized),
          url: body.AbstractURL,
          snippet: clean(body.AbstractText),
          source: "duckduckgo"
        });
      }

      const pushTopic = (firstUrl?: string, text?: string) => {
        if (!firstUrl || !text) return;
        items.push({
          title: clean(text.split(" - ")[0] || text),
          url: firstUrl,
          snippet: clean(text),
          source: "duckduckgo"
        });
      };

      for (const topic of body.RelatedTopics ?? []) {
        if ("Topics" in topic && Array.isArray(topic.Topics)) {
          for (const nested of topic.Topics) pushTopic(nested.FirstURL, nested.Text);
          continue;
        }
        if ("FirstURL" in topic && "Text" in topic) pushTopic(topic.FirstURL, topic.Text);
      }
    }
  }

  if (items.length === 0) {
    const wikiResponse = await fetchWithTimeout(toWikiUrl(normalized), 7000);
    if (wikiResponse?.ok) {
      const wikiRaw = await wikiResponse.text();
      const wiki = tryParseJson<WikiOpenSearchResponse>(wikiRaw);
      if (wiki) {
        const titles = Array.isArray(wiki[1]) ? wiki[1] : [];
        const snippets = Array.isArray(wiki[2]) ? wiki[2] : [];
        const urls = Array.isArray(wiki[3]) ? wiki[3] : [];
        for (let i = 0; i < Math.min(titles.length, urls.length); i += 1) {
          const url = urls[i];
          const title = titles[i];
          if (!url || !title) continue;
          items.push({
            title: clean(title),
            url: clean(url),
            snippet: clean(snippets[i] ?? ""),
            source: "wikipedia"
          });
        }
      }
    }
  }

  const deduped = new Map<string, WebSearchItem>();
  for (const item of items) {
    if (!deduped.has(item.url)) deduped.set(item.url, item);
  }
  return Array.from(deduped.values()).slice(0, 8);
};
