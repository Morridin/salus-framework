file=$(tr -d "\r\n[:space:]" < "$2");
res=$(cat "$file");
echo "<pre>" $res "</pre>";
