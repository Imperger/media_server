```
docker build -t media_server .
docker run --rm --name my_media_server -p 8080:3000 -v $PWD:/app/media media_server
```