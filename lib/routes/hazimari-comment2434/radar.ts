export const radar = [
    {
        title: 'Comment2434 キーワード検索',
        docs: 'https://docs.rsshub.app/routes/other#comment2434',
        source: ['https://comment2434.com/comment'],
        target: (params, url) => {
            const keyword = new URL(url).searchParams.get('keyword');
            return keyword ? `/comment2434/${keyword}` : null;
        },
    },
];
