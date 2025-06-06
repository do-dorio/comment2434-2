import { Route } from '@/types';
import got from '@/utils/got';

const memoryCache = new Map<string, { expire: number; value: any }>();

function parseYouTubeTimeText(text: string): Date | null {
    const now = new Date();
    const match = text.match(/(\d+)\s*(秒|分|時間|日|週|か月|年)前/);
    if (!match) {
        return null;
    }

    const value = Number.parseInt(match[1], 10);
    const unit = match[2];

    const msPerUnit = {
        秒: 1000,
        分: 1000 * 60,
        時間: 1000 * 60 * 60,
        日: 1000 * 60 * 60 * 24,
        週: 1000 * 60 * 60 * 24 * 7,
        か月: 1000 * 60 * 60 * 24 * 30,
        年: 1000 * 60 * 60 * 24 * 365,
    };

    const diff = msPerUnit[unit] * value;
    return new Date(now.getTime() - diff);
}

async function fetchYouTubeResults(keyword: string) {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}&sp=CAI%3D`;
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        Connection: 'keep-alive',
    };

    const response = await got(url, { headers, responseType: 'text' });
    const match = response.body.match(/var ytInitialData = (\{.*?\});<\/script>/);
    if (!match || !match[1]) {
        throw new Error('ytInitialData not found');
    }

    const jsonData = JSON.parse(match[1]);
    const extractVideoRenderers = (data: any): any[] => {
        const results: any[] = [];
        if (Array.isArray(data)) {
            for (const item of data) {
                results.push(...extractVideoRenderers(item));
            }
        } else if (typeof data === 'object' && data !== null) {
            if (data.videoRenderer) {
                results.push(data.videoRenderer);
            }
            for (const value of Object.values(data)) {
                results.push(...extractVideoRenderers(value));
            }
        }
        return results;
    };

    const videoRenderers = extractVideoRenderers(jsonData);

    return videoRenderers
        .map((renderer) => {
            const durationText = renderer.lengthText?.simpleText || '';
            if (durationText) {
                const [minStr, secStr] = durationText.split(':').map((s) => s.trim());
                const durationSec = (Number(minStr) || 0) * 60 + (Number(secStr) || 0);
                if (durationSec <= 180) {return null;}
            }

            const videoId = renderer.videoId;
            const title = renderer.title?.runs?.[0]?.text || 'No Title';
            const author = renderer.ownerText?.runs?.[0]?.text || 'Unknown';
            const desc = renderer.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r: any) => r.text).join('') || '';
            const imageUrl = renderer.thumbnail?.thumbnails?.[0]?.url || '';
            const link = `https://www.youtube.com/watch?v=${videoId}`;
            const pubText = renderer.publishedTimeText?.simpleText || '';
            const pubDate = parseYouTubeTimeText(pubText) || new Date();

            return {
                title,
                author,
                description: imageUrl ? `<img src="${imageUrl}" referrerpolicy="no-referrer"><br>${desc}` : desc,
                pubDate,
                link,
                rawPubText: pubText,
            };
        })
        .filter(Boolean);
}

const handler: Route['handler'] = async (ctx) => {
    const rawCacheTime = Number.parseInt(ctx.req.param('cacheTime') || '', 10);
    const keyword = ctx.req.param('keyword') || 'default';
    const cacheTime = Number.isNaN(rawCacheTime) ? 3600 : Math.max(60, rawCacheTime);
    const cacheKey = `youtubeSearch:${keyword}:${cacheTime}`;
    const now = Date.now();

    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expire > now) {
        return {
            title: `Cached - ${keyword}`,
            link: 'https://www.youtube.com/',
            item: cached.value,
        };
    }

    let keywordsToSearch = [keyword];
    try {
        const aliasURL = 'https://do-dorio.github.io/config-data-filter/assets/9e23x-internal/yts-bl9e.json';
        const { data: aliasMap } = await got(aliasURL);

        // 構造変更に対応
        const wildcardMap = aliasMap.wildcardKeywordMap ?? {};
        if (wildcardMap[keyword]) {
            keywordsToSearch = wildcardMap[keyword];
        }
    } catch {
        // fallback: keyword as-is
    }

    const results = (await Promise.all(keywordsToSearch.map(fetchYouTubeResults))).flat();

    let authorBlockList = [];
    let titleBlockList = [];
    try {
        const filterURL = 'https://do-dorio.github.io/config-data-filter/assets/9e23x-internal/yts-bl9e.json';
        const { data: filterConfig } = await got(filterURL);
        authorBlockList = filterConfig.authorBlocklist ?? [];
        titleBlockList = filterConfig.titleBlocklist ?? [];
    } catch {
        authorBlockList = [];
        titleBlockList = [];
    }

    const filteredItems = results
        .filter((item) => !authorBlockList.some((name) => (item.author || '').includes(name)))
        .filter((item) => !titleBlockList.some((name) => (item.title || '').includes(name)))
        .filter((item) => {
            if (!item.rawPubText || item.rawPubText.includes('ライブ')) {
                return true;
            }
            const time = item.pubDate instanceof Date ? item.pubDate.getTime() : 0;
            return Date.now() - time <= 48 * 60 * 60 * 1000;
        });

    memoryCache.set(cacheKey, {
        expire: now + cacheTime * 1000,
        value: filteredItems,
    });

    return {
        title: `comment2434 - ${keyword}`,
        link: 'https://www.youtube.com/',
        item: filteredItems,
    };
};

export default handler;

export const route: Route = {
    path: '/:cacheTime/:keyword',
    categories: ['live'],
    example: '/hazimari-youtubeSearch/3600/猫',
    parameters: {
        cacheTime: 'キャッシュ時間（秒）',
        keyword: '検索キーワード（例：「猫」や「ゲーム」など）',
    },
    name: 'Hazimari Youtube Search',
    url: 'youtube.com',
    maintainers: ['yourGitHubUsername'],
    handler,
};
