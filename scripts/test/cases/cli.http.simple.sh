
pwd | grep -q '/redex$' || exit 1

mkdir -p tmp

testName=cli.http.simple

nodejs index.js http cancel | bunyan -o short # warmup

export pidFile=tmp/redex.${testName}.pid

c0server() {
  rm -f $pidFile
  nodejs index.js http | bunyan -o short
}

c0client() {
  sleep 4
  if curl -s http://localhost:8880/README.md > tmp/curl.txt
  then
    if head -2 tmp/curl.txt | grep 'Redex'
    then
      echo "$testName $0 OK"
    else
      echo 'FAILED'
    fi
  else
    echo "exit code: $?"
  fi
  echo "rm $pidFile to shutdown Redex"
  rm -f $pidFile
}

  c0client & c0server
