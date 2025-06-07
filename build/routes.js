export default {
  "hazimari-comment2434": {
    "routes": {
      "/:cacheTime/:keyword": {
        "path": "/:cacheTime/:keyword",
        "categories": [
          "live"
        ],
        "example": "/hazimari-comment2434/3600/猫",
        "parameters": {
          "cacheTime": "キャッシュ時間（秒）",
          "keyword": "検索キーワード（例：「猫」や「ゲーム」など）"
        },
        "name": "Comment2434",
        "url": "comment2434.com",
        "maintainers": [
          "yourGitHubUsername"
        ],
        "location": "router.ts",
        "module": () => import('@/routes/hazimari-comment2434/router.ts')
      }
    },
    "name": "comment2434",
    "url": "https://comment2434.com/",
    "description": "comment2434 の RSS フィード"
  },
  "hazimari-youtubeSearch": {
    "routes": {
      "/:cacheTime/:keyword": {
        "path": "/:cacheTime/:keyword",
        "categories": [
          "live"
        ],
        "example": "/hazimari-youtubeSearch/3600/猫",
        "parameters": {
          "cacheTime": "キャッシュ時間（秒）",
          "keyword": "検索キーワード（例：「猫」や「ゲーム」など）"
        },
        "name": "Hazimari Youtube Search",
        "url": "youtube.com",
        "maintainers": [
          "yourGitHubUsername"
        ],
        "location": "router.ts",
        "module": () => import('@/routes/hazimari-youtubeSearch/router.ts')
      }
    },
    "name": "youtubeSearch",
    "url": "https://youtube.com/",
    "description": "youtube検索 の RSS フィード"
  },
  "hazimari-youtubeStudy": {
    "routes": {
      "/:cacheTime/:keyword": {
        "path": "/:cacheTime/:keyword",
        "categories": [
          "study"
        ],
        "example": "/hazimari-youtubeStudy/3600/auto",
        "parameters": {
          "cacheTime": "キャッシュ時間（秒）",
          "keyword": "検索キーワード。\"auto\" にすると語句リストからランダム選出されます。"
        },
        "name": "Hazimari Youtube Study",
        "url": "youtube.com",
        "maintainers": [
          "yourGitHubUsername"
        ],
        "location": "router.ts",
        "module": () => import('@/routes/hazimari-youtubeStudy/router.ts')
      }
    },
    "name": "youtubeStady",
    "url": "https://youtube.com/",
    "description": "youtubeの 検索のRSS フィード"
  }
}