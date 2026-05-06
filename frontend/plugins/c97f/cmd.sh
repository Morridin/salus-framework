file=$(cat "$2" | tr -d "\r\n[:space:]")
res=$(cat "$file")
echo "<pre>" $res "</pre>"
