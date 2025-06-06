import { Route } from '@/types';
import got from '@/utils/got';

const memoryCache = new Map<string, { expire: number; value: any }>();

function parseYouTubeTimeText(text: string): Date | null {
    const now = new Date();
    const match = text.match(/(\d+)\s*(秒|分|時間|日|週|か月|年)前/);
    if (!match) {return null;}

    const value = Number.parseInt(match[1], 10);
    const unit = match[2];

    const msPerUnit: Record<string, number> = {
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

async function fetchYouTubeResults(keyword: string, titleBlockList: string[], authorBlockList: string[]) {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}&sp=CAI%3D`;
    const headers = {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'text/html',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        Connection: 'keep-alive',
    };

    const response = await got(url, { headers, responseType: 'text' });
    const match = response.body.match(/var ytInitialData = (\{.*?\});<\/script>/);
    if (!match || !match[1]) {throw new Error('ytInitialData not found');}

    const jsonData = JSON.parse(match[1]);

    function extractVideoRenderers(data: any): any[] {
        const results: any[] = [];
        if (Array.isArray(data)) {
            for (const item of data) {results.push(...extractVideoRenderers(item));}
        } else if (typeof data === 'object' && data !== null) {
            if (data.videoRenderer) {results.push(data.videoRenderer);}
            for (const value of Object.values(data)) {results.push(...extractVideoRenderers(value));}
        }
        return results;
    }

    const videoRenderers = extractVideoRenderers(jsonData);

    return videoRenderers
        .map((renderer) => {
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
        .filter((item) => !titleBlockList.some((word) => item.title.includes(word)))
        .filter((item) => !authorBlockList.some((word) => item.author.includes(word)));
}

const handler: Route['handler'] = async (ctx) => {
    const rawCacheTime = Number.parseInt(ctx.req.param('cacheTime') || '', 10);
    const keywordParam = ctx.req.param('keyword') || 'default';
    const cacheTime = Number.isNaN(rawCacheTime) ? 3600 : Math.max(60, rawCacheTime);
    const now = Date.now();

    // Load study list and block list
    const vocabUrl = 'https://raw.githubusercontent.com/do-dorio/config-data-filter/main/assets/9e23x-internal/yts-rs0a.json';
    const response = await got(vocabUrl);
    const rawText = response.body;
    const data = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
    const vocabList: string[] = data.studyList;
    const titleBlockList: string[] = data.blockList?.title || [];
    const authorBlockList: string[] = data.blockList?.author || [];

    const usedKey = 'youtubeStudy:usedWords';
    const used = memoryCache.get(usedKey)?.value || [];
    const available = vocabList.filter((word) => !used.includes(word));

    if (available.length === 0) {
        memoryCache.set(usedKey, { expire: now + 7 * 86400 * 1000, value: [] });
        throw new Error('全語句使用済みです。キャッシュをリセットしてください。');
    }

    const selected = keywordParam === 'auto' ? available[Math.floor(Math.random() * available.length)] : keywordParam;

    if (keywordParam === 'auto') {
        memoryCache.set(usedKey, {
            expire: now + 30 * 86400 * 1000,
            value: [...used, selected],
        });
    }

    const cacheKey = `youtubeSearch:${selected}:${cacheTime}`;
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expire > now) {
        return {
            title: `Cached - ${selected}`,
            link: 'https://www.youtube.com/',
            item: cached.value,
        };
    }

    const results = await fetchYouTubeResults(selected, titleBlockList, authorBlockList);

    memoryCache.set(cacheKey, {
        expire: now + cacheTime * 1000,
        value: results,
    });

    return {
        title: `Youtube Study - ${selected}`,
        link: 'https://www.youtube.com/',
        item: results,
    };
};

export default handler;

export const route: Route = {
    path: '/:cacheTime/:keyword',
    categories: ['study'],
    example: '/hazimari-youtubeStudy/3600/auto',
    parameters: {
        cacheTime: 'キャッシュ時間（秒）',
        keyword: '検索キーワード。"auto" にすると語句リストからランダム選出されます。',
    },
    name: 'Hazimari Youtube Study',
    url: 'youtube.com',
    maintainers: ['yourGitHubUsername'],
    handler,
};
