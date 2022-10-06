# Hands-on t3-stack + k3s
* [k3s](https://github.com/k3s-io/k3s): Lightweight Kubernetes which can run on local docker.
* [t3-stack](https://github.com/t3-oss/create-t3-app): Next.js, tRPC(router), Prisma(ORM), Tailwind(UI kit), NextAuth.js.

This hands-on explains how to start developing t3-app and make it deployed on k3s cluster running on docker compose.

Hands-on toc

0. Scaffolding t3-stack app with yarn.
1. Make a docker image for a t3-stack app.
1. Push the image to a local registry
1. Use postgresql and localstack
1. Use AWS SDK for s3 in localstack
1. Launch k3s
1. Deploy the app onto the cluster


## requirements
* yarn (brew install yarn)
* docker
* aws (brew install awscli)
* kubectl (brew install kubectl)


## 0. Scaffolding a t3-stack app
```
$ yarn create t3-app
-> name: hands-on-t3stack-on-k3s
-> check all features. typescript, tRPC, ...
```
```
$ cd hands-on-t3stack-on-k3s
$ yarn dev
...
# open http://localhost:3000
```

Build and start as production.
```
$ yarn build
$ yarn start
...
# open http://localhost:3000
```


## 1. Make a docker image for the app
Copy `/Dockerfile`.

Patch `next.config.mjs`.
```diff
$ git diff
diff --git a/next.config.mjs b/next.config.mjs
index d5988e7..19651cc 100644
--- a/next.config.mjs
+++ b/next.config.mjs
@@ -20,4 +20,5 @@ export default defineNextConfig({
     locales: ["en"],
     defaultLocale: "en",
   },
+  output: "standalone",
 });
```

Build an image and test it to run.
```
$ docker build -t t3stack .
...
$ docker run -p 3000:3000 t3stack
# open http://localhost:3000
```

## 2. Push the image to a local registry
Local registry to be available.
`Preferences` -> `Docker engine`.
```
  "insecure-registries": [
    "registry.local:5000"
  ]
```
```
$ cat /etc/hosts
...
127.0.0.1 registry.local
```

Copy `/docker-compose.registry.yml`.
You may need to disable AirPlay receiver[^1] if you use recent macOS.
```
$ docker compose -f ./docker-compose.registry.yml up -d
...
$ docker compose -f ./docker-compose.registry.yml ps
NAME                                       COMMAND                  SERVICE             STATUS              PORTS
hands-on-t3stack-on-k3s-registry.local-1   "/entrypoint.sh /etc…"   registry.local      running             0.0.0.0:5000->5000/tcp
```
[^1]: It's listening at :5000. Go to `system preferences` -> `sharing`, uncheck AirPlay receiver.

Tagging and push it.
```
$ docker tag t3stack registry.local:5000/t3stack
$ docker push registry.local:5000/t3stack
...
latest: digest: sha256:cc5f921ed04a0d9bed2aff957c6cdab886a3e542b63bf70495ab2acc2959f319 size: 3465
```


## 3. Use postgresql and localstack
Copy `/docker-compose.pg-localstack.yml`.
```
$ docker compose -f ./docker-compose.registry.yml -f docker-compose.pg-localstack.yml up -d
[+] Running 3/3
 ⠿ Container hands-on-t3stack-on-k3s-localstack-1      Started
 ⠿ Container hands-on-t3stack-on-k3s-postgres-1        Started
 ⠿ Container hands-on-t3stack-on-k3s-registry.local-1  Running
```
Ensure localstack working.
```
$ aws --endpoint-url=http://localhost:4566 s3 ls; echo $?
0
```

Ensure postgresql working.
Patch the provider of prisma.
```
% git diff
diff --git a/prisma/schema.prisma b/prisma/schema.prisma
index 21876bc..c52e0ac 100644
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -6,7 +6,7 @@ generator client {
 }

 datasource db {
-    provider = "sqlite"
+    provider = "postgresql"
     // NOTE: When using postgresql, mysql or sqlserver, uncomment the @db.text annotations in model Account below
     // Further reading:
     // https://next-auth.js.org/adapters/prisma#create-the-prisma-schema
```
`db push`.
```
$ DATABASE_URL=postgresql://admin:abc123@localhost:5432/example yarn prisma db push
$ /path/to/hands-on-t3stack-on-k3s/node_modules/.bin/prisma db push
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "example", schema "public" at "localhost:5432"

🚀  Your database is now in sync with your Prisma schema. Done in 609ms

✔ Generated Prisma Client (4.4.0 | library) to ./node_modules/@prisma/client in 53ms

✨  Done in 2.22s.
```
```
$ docker run --rm -it --net=host -e PGPASSWORD=abc123 postgres:14-alpine psql -h localhost -U admin example
psql (14.5)
Type "help" for help.

example=# \d
             List of relations
 Schema |       Name        | Type  | Owner
--------+-------------------+-------+-------
 public | Account           | table | admin
 public | Example           | table | admin
 public | Session           | table | admin
 public | User              | table | admin
 public | VerificationToken | table | admin
(5 rows)
```


## 4. Use AWS SDK for s3 in localstack
```
$ yarn add @aws-sdk/client-s3
...
$ AWS_ENDPOINT=http://localhost:4566 yarn dev
....
```
Copy `/src/pages/aws.tsx`.
open http://localhost:3000/aws

You'll see "No s3 buckets".
Type the command in the page to create a new bucket locally.
Then you will see the bucket when you reload the browser.


## 5. Launch k3s
Make a `k3s.env` and source it.
```
export KUBECONFIG=./kubeconfig.yaml
export K3S_TOKEN=abc123
```

Copy `/docker-compose.k3s.yml`.
Copy `/registries.yaml`.
```
% docker compose -f docker-compose.registry.yml -f docker-compose.pg-localstack.yml -f docker-compose.k3s.yml up -d
[+] Running 6/6
 ⠿ Volume "hands-on-t3stack-on-k3s_k3s-server"         Created
 ⠿ Container hands-on-t3stack-on-k3s-agent-1           Started
 ⠿ Container hands-on-t3stack-on-k3s-server-1          Started
 ⠿ Container hands-on-t3stack-on-k3s-registry.local-1  Running
 ⠿ Container hands-on-t3stack-on-k3s-postgres-1        Running
 ⠿ Container hands-on-t3stack-on-k3s-localstack-1      Running
```
Ensure `kubeconfig.yaml` is generated.

After a few tens seconds, you will see system components of k8s.
```
$ source ./k3s.env
$ kubectl get pods -A
NAMESPACE     NAME                                      READY   STATUS      RESTARTS   AGE
kube-system   coredns-d76bd69b-rkz8k                    1/1     Running     0          88s
kube-system   local-path-provisioner-6c79684f77-5q68t   1/1     Running     0          88s
kube-system   helm-install-traefik-crd-6jmlh            0/1     Completed   0          89s
kube-system   helm-install-traefik-c2v94                0/1     Completed   0          89s
kube-system   svclb-traefik-c15876f5-sxglz              2/2     Running     0          65s
kube-system   svclb-traefik-c15876f5-2dlzt              2/2     Running     0          65s
kube-system   metrics-server-7cd5fcb6b7-cl5gs           1/1     Running     0          88s
kube-system   traefik-df4ff85d6-cdbcl                   1/1     Running     0          65s
```


## 6. Deploy the app onto the cluster
```
$ curl -X GET http://registry.local:5000/v2/_catalog
{"repositories":["t3stack"]}

$ curl -X GET http://registry.local:5000/v2/t3stack/tags/list
{"name":"t3stack","tags":["latest"]}
```

Copy `/t3stack.yml` which is a very simple manifest containing a service and a deployment.
```
$ cat t3stack.yml | kubectl apply -f -
service/t3stack unchanged
deployment.apps/t3stack created

$ kubectl get pods
NAME                       READY   STATUS    RESTARTS   AGE
t3stack-59fb8b9684-d9kh8   1/1     Running   0          74m
```
Open http://localhost:9981/ if it's ready (`1/1`).

You'lil see "Internal Server Error".
Let's identify the reason by seeing the logs.

```
$ kubectl logs t3stack-59fb8b9684-d9kh8
...
TypeError [ERR_INVALID_URL]: Invalid URL
    at new NodeError (node:internal/errors:387:5)
    ...
    at Module.require (node:internal/modules/cjs/loader:1028:19) {
  input: 'http://%__MY_IPADDR__%:9981',
  code: 'ERR_INVALID_URL'
}

# one-linear:
#   pod=$(kubectl get pods -o json | jq -r ".items[0].metadata.name"); kubectl logs ${pod} -f
```

Sorry, I forgot to patch hostnames in the manifeset.
Let's fix.

Plesae identify the IP address of your machine somehow.
```
# You may see it if yo use macOS.
% ifconfig | grep 'inet.*broad'
        inet 192.168.123.123 netmask 0xffffff00 broadcast 192.168.123.255
```
```
$ MY_IPADDR=192.168.123.123
$ cat t3stack.yml | sed 's/%__MY_IPADDR__%/'${MY_IPADDR}'/g' | kubectl apply -f -
service/t3stack unchanged
deployment.apps/t3stack configured
```

Then visit http://localhost:9981/ again.
You should see the top page of the app.

How about http://localhost:9981/aws?
You will see 404.

```
$ docker tag t3stack:latest t3stack:no-aws  # save the current image.
$ docker build -t t3stack .                 # build a new one with the /aws page.
```
```
$ docker tag t3stack registry.local:5000/t3stack
$ docker push registry.local:5000/t3stack
...
```

It expected like this for t3stack images.
```
% docker image ls | grep t3stack
t3stack                       latest      081892368af2   2 minutes ago   899MB
registry.local:5000/t3stack   latest      081892368af2   2 minutes ago   899MB
t3stack                       no-aws      686377958143   12 hours ago    897MB
registry.local:5000/t3stack   <none>      686377958143   12 hours ago    897MB
```

OK, apply it.
```
% cat t3stack.yml | sed 's/%__MY_IPADDR__%/'${MY_IPADDR}'/g' | kubectl apply -f -
service/t3stack unchanged
deployment.apps/t3stack unchanged
```
<img width="25%" src="https://pbs.twimg.com/media/DiHg_GoVMAE87Bb?format=jpg&name=small"/>

k8s doesn't change anything because the manifest doens't have any updates.

Use `rollout` if you use a new image without any changes for manifests.
```
$ kubectl rollout restart deployment t3stack
deployment.apps/t3stack restarted
```

Then you can see the `/aws` page.

