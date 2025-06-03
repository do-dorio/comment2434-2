import { Route } from '@/types';
import got from '@/utils/got';
import * as cheerio from 'cheerio';
import { parseDate } from '@/utils/parse-date';

const handler: Route['handler'] = async () => {
    // async(ctx)
    const keyword = 'きつね'; // ctx.req.param('keyword');

    const url = `https://comment2434.com/comment/?keyword=${encodeURIComponent(keyword)}&type=0&mode=0&sort_mode=0`;

    const response = await got(url);
    const $ = cheerio.load(response.data);

    const items = $('#result .row')
        .toArray()
        .map((elem) => {
            const $elem = cheerio.load(elem);
            const href = $elem('a').attr('href');

            // hrefがない場合はnullを返す（あとで除外）
            if (!href) {
                return null;
            }

            return {
                title: $elem('h5').text().trim(),
                description: $elem('p').eq(1).text().trim(),
                pubDate: parseDate($elem('p').eq(2).text().trim()),
                link: new URL(href, 'https://comment2434.com').href,
                upvotes: undefined,
                downvotes: undefined,
                comments: undefined,
            };
        })
        .filter((item): item is Exclude<typeof item, null> => item !== null); // null除去

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
