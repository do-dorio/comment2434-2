import { Route } from '@/types';
import got from '@/utils/got';
import * as cheerio from 'cheerio';
import { parseDate } from '@/utils/parse-date';

const memoryCache = new Map<string, { expire: number; value: any }>();

const handler: Route['handler'] = async (ctx) => {
    // Hono形式でルートパラメータを取得
    const rawCacheTime = Number.parseInt(ctx.req.param('cacheTime') || '', 10);
    const keyword = ctx.req.param('keyword') || 'default';

    // 最小60秒に制限、デフォルト3600秒
    const cacheTime = Number.isNaN(rawCacheTime) ? 3600 : Math.max(60, rawCacheTime);

    // キャッシュキーを構築（cacheTimeを含めて完全分離）
    const cacheKey = `comment2434:${keyword}:${cacheTime}`;
    const now = Date.now();

    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expire > now) {
        return {
            title: `Cached - ${keyword}`,
            link: `https://example.com?q=${keyword}`,
            item: cached.value,
        };
    }

    const url = `https://comment2434.com/comment/?keyword=${encodeURIComponent(keyword)}&type=0&mode=0&sort_mode=0`;

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        Connection: 'keep-alive',
    };

    let html = '';
    let $: cheerio.CheerioAPI;
    let rows: cheerio.Cheerio;
    const maxRetries = 15;

    for (let i = 0; i < maxRetries; i++) {
        // eslint-disable-next-line no-await-in-loop
        const response = await got(url, {
            headers,
            responseType: 'text', // ← これが重要！
            retry: { limit: 2, statusCodes: [503], calculateDelay: () => 1000 },
        });

        html = response.body; // ← 文字列として取得！
        $ = cheerio.load(html);
        rows = $('#result > div');

        if (rows.length > 0) {
            break;
        }
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 1000));
    }

    if (!rows || rows.length === 0) {
        throw new Error(`Timeout: #result > div not found for keyword "${keyword}"`);
    }

    const items = rows
        .toArray()
        .map((elem) => {
            const $elem = cheerio.load(elem);
            const href = $elem('a').attr('href');
            const title = $elem('h5').text().trim();

            const dateText = $elem('p').eq(1).text().trim();
            const description = $elem('p').eq(2).text().trim();
            const cleanDate = dateText.replaceAll(/年|月/g, '-').replaceAll('日', '');
            const pubDate = parseDate(cleanDate);
            const author = $elem('p').eq(0).text().trim(); // ← 1番目が著者名
            const imageSrc = $elem('img').attr('src');
            const imageUrl = imageSrc ? new URL(imageSrc, 'https://comment2434.com').href : '';

            if (!href || !title) {
                return null;
            }

            return {
                title,
                author,
                description: imageUrl ? `<img src="${imageUrl}" referrerpolicy="no-referrer"><br>${description}` : description,
                pubDate: pubDate ?? new Date(),
                link: new URL(href, 'https://comment2434.com').href,
            };
        })
        .filter((item): item is Exclude<typeof item, null> => item !== null);

    const blockedAuthors = [
        'セラフ・ダズルガーデン',
        'Kuzuha',
        'ローレン・イロアス',
        '渋谷ハジメ',
        '伏見ガク',
        '剣持刀也',
        'Kanae',
        '花畑チャイカ',
        '社築',
        '卯月コウ',
        '神田笑一',
        '春崎エアル',
        '舞元啓介',
        'でびでび・でびる',
        'ジョー・力一',
        'ベルモンド・バンデラス',
        '夢追翔',
        '三枝明那',
        'エクス・アルビオ',
        '加賀美 ハヤト',
        'シェリン・バーガンディ',
        '不破 湊',
        'グウェル',
        'ましろ',
        'イブラヒム',
        '長尾 景',
        '弦月 藤士郎',
        '甲斐田 晴',
        'ローレン・イロアス',
        'レオス・ヴィンセント',
        'オリバー・エバンス',
        '風楽奏斗',
        '渡会雲雀',
        '四季凪アキラ',
        'セラフ・ダズルガーデン',
        'ハユン 하윤',
        '佐伯イッテツ',
        '赤城ウェン',
        '宇佐美リト',
        '緋八マナ',
        '星導ショウ',
        '叢雲カゲツ',
        '小柳ロウ',
        '伊波ライ',
        'ミラン・ケストレル',
        '北見遊征',
        '魁星',
        '酒寄颯馬',
        '渚トラウト',
        '一橋綾人',
        '榊ネス',
        '五木左京',
        'VΔLZ',
        'VOLTACTION',
        'Oriens',
        '3SKM',
        'Speciale',
        'ChroNoiR',
        'Alban Knox',
        'Vox Akuma',
        'Shu Yamino',
        '민수하',
        '가온 ガオン',
        'Vezalius Bandage',
    ];

    const filteredItems = items.filter((item) => !blockedAuthors.some((name) => (item.author || '').includes(name)));

    memoryCache.set(cacheKey, {
        expire: now + cacheTime * 1000,
        value: filteredItems,
    });

    return {
        title: `comment2434 - ${keyword}`,
        link: url,
        item: filteredItems,
    };
};

export const route: Route = {
    path: '/:cacheTime/:keyword',
    categories: ['live'],
    example: '/hazimari-comment2434/3600/猫',
    parameters: {
        cacheTime: 'キャッシュ時間（秒）',
        keyword: '検索キーワード（例：「猫」や「ゲーム」など）',
    },
    name: 'Comment2434',
    url: 'comment2434.com',
    maintainers: ['yourGitHubUsername'],
    handler,
};
