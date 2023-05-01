# Sandbox

My personnal sandbox to experiment with node/typescript/...

## Redis

Experiment some redis data manipulation in typescript

### Setup

Start a redis server using docker

```
docker pull redis/redis-stack-server
```

then

```
docker run -d --name redis-stack  redis/redis-stack-server:latest
```

To know the container IP address

```
$ docker ps

CONTAINER ID        IMAGE                             COMMAND                  CREATED             STATUS              PORTS                  NAMES
59603b77ba2d        redis/redis-stack-server:latest   "/entrypoint.sh"         38 minutes ago      Up 38 minutes       6379/tcp               redis-stack

$ docker inspect 59603b77ba2d | grep IPAddress
"SecondaryIPAddresses": null,
            "IPAddress": "172.17.0.2",
                    "IPAddress": "172.17.0.2",
```
