
pwd | grep -q '/redex$' || exit 1

  babel-node test/redisPromised.js | bunyan -o short
