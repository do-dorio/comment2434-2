import { Route } from '@/types';
import got from '@/utils/got';
import * as cheerio from 'cheerio';
import { parseDate } from '@/utils/parse-date';

const handler: Route['handler'] = async (ctx) => {
    const fullPath = ctx.req.path;
    const keyword = decodeURIComponent(fullPath.split('/').pop() || '');
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

        if (rows.length > 0) {break;}
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
            const description = $elem('p').eq(1).text().trim(); // ← 2番目が説明（時刻の前）
            const dateText = $elem('p').eq(2).text().trim(); // ← 3番目が日時
            const author = $elem('p').eq(0).text().trim(); // ← 1番目が著者名
            const imageSrc = $elem('img').attr('src');
            const imageUrl = imageSrc ? new URL(imageSrc, 'https://comment2434.com').href : '';

            if (!href || !title) {return null;}

            return {
                title,
                author,
                description: imageUrl ? `<img src="${imageUrl}" referrerpolicy="no-referrer"><br>${description}` : description,
                pubDate: parseDate(dateText),
                link: new URL(href, 'https://comment2434.com').href,
            };
        })
        .filter((item): item is Exclude<typeof item, null> => item !== null);

    return {
        title: `comment2434 - ${keyword}`,
        link: url,
        item: items,
    };
};

export const route: Route = {
    path: '/:keyword',
    categories: ['live'],
    example: '/comment2434/猫',
    parameters: {
        keyword: '検索キーワード（例：「猫」や「ゲーム」など）',
    },
    name: 'Comment2434',
    url: 'comment2434.com',
    maintainers: ['yourGitHubUsername'],
    handler,
};
