export default {
  "hazimari-comment2434": {
    "routes": {
      "/:keyword": {
        "path": "/:keyword",
        "categories": [
          "live"
        ],
        "example": "/hazimari-comment2434/猫",
        "parameters": {
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
  }
}