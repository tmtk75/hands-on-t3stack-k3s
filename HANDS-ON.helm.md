# Helm hand-on
Install next resources with helm. Install helm with brew, `brew install helm`.
* Nginx ingress controller. <https://artifacthub.io/packages/helm/nginx-ingress-chart/nginx-ingress>
* localstack. <https://artifacthub.io/packages/helm/localstack/localstack>
* PostgreSQL. <https://artifacthub.io/packages/helm/bitnami/postgresql>


## Set up
Assuming you finished `HANDS-ON.md`.
Once you stop all and start up again with two files.
```
$ docker compose -f docker-compose.pg-localstack.yml -f docker-compose.registry.yml -f docker-compose.k3s.yml stop

$ docker compose -f docker-compose.k3s.yml -f docker-compose.registry.yml up
```


## Nginx-ingress-controller
Assuming `t3stack` image exists in the local registry. See HANDS-ON.md if not yet.

https://helm.sh/docs/intro/quickstart/
```
% helm repo add bitnami https://charts.bitnami.com/bitnami
% helm repo update
% helm install my-ingress oci://ghcr.io/nginxinc/charts/nginx-ingress --version 1.1.2
```
```
% helm list
...
NAME                    NAMESPACE       REVISION        UPDATED                                 STATUS          CHART                   APP VERSION
my-ingress         1               2024-01-19 12:26:02.078039 +0900 JST    deployed        nginx-ingress-1.1.2     3.4.2
...
```
```
% kubectl apply -f - < nginx-ingress.yml
% kubectl apply -f - < t3stack.yml
```

The request is routed to the pod.
```
% curl -v localhost:80
*   Trying 127.0.0.1:80...
* Connected to localhost (127.0.0.1) port 80 (#0)
> GET / HTTP/1.1
> Host: localhost
> User-Agent: curl/8.1.2
> Accept: */*
>
< HTTP/1.1 500 Internal Server Error
< Content-Length: 21
< Content-Type: text/html; charset=utf-8
< Date: Sat, 20 Jan 2024 12:44:28 GMT
< Etag: "66fci67lppl"
< Vary: Accept-Encoding
< X-Powered-By: Next.js
<
* Connection #0 to host localhost left intact
Internal Server Error
```

Replace `%__MY_IPADDR__%` with your local IP address to fix Internal Server Error.


## Localstack
https://artifacthub.io/packages/helm/localstack/localstack
```
helm repo add localstack-charts https://localstack.github.io/helm-charts
helm install my-release localstack-charts/localstack
```

Open <http://localhost/aws> and you'll the next message.
```
aws --endpoint-url=http://localhost:4566 s3api create-bucket --bucket my-1st-bucket --region=us-east-1
```
```
[1]% source k3s.yml
[1]% kubectl get pod | grep local
my-localstack-7fd5f9f754-w2sq6                         1/1     Running   4 (76m ago)   12h

[1]% kubectl port-forward my-localstack-7fd5f9f754-w2sq6 4566:4566
Forwarding from 127.0.0.1:4566 -> 4566
Forwarding from [::1]:4566 -> 4566
```

Then you can create the bucket in the cluster.
```
% aws --endpoint-url=http://localhost:4566 s3api create-bucket --bucket my-1st-bucket --region=us-east-1
{
    "Location": "/my-1st-bucket"
}
```

Again, you'll see a new message like `my-1st-bucket: 2024-01-21T02:08:39.000Z` when you visit <http://localhost/aws>
because the app can recognize the created bucket.


## PostgreSQL
https://artifacthub.io/packages/helm/bitnami/postgresql
```
helm install my-postgres oci://registry-1.docker.io/bitnamicharts/postgresql

...

PostgreSQL can be accessed via port 5432 on the following DNS names from within your cluster:

    my-postgres-postgresql.default.svc.cluster.local - Read/Write connection

To get the password for "postgres" run:

    export POSTGRES_PASSWORD=$(kubectl get secret --namespace default my-postgres-postgresql -o jsonpath="{.data.postgres-password}" | base64 -d)

To connect to your database run the following command:

    kubectl run my-postgres-postgresql-client --rm --tty -i --restart='Never' --namespace default --image docker.io/bitnami/postgresql:16.1.0-debian-11-r20 --env="PGPASSWORD=$POSTGRES_PASSWORD" \
      --command -- psql --host my-postgres-postgresql -U postgres -d postgres -p 5432

    > NOTE: If you access the container using bash, make sure that you execute "/opt/bitnami/scripts/postgresql/entrypoint.sh /bin/bash" in order to avoid the error "psql: local user with ID 1001} does not exist"

To connect to your database from outside the cluster execute the following commands:

    kubectl port-forward --namespace default svc/my-postgres-postgresql 5432:5432 &
    PGPASSWORD="$POSTGRES_PASSWORD" psql --host 127.0.0.1 -U postgres -d postgres -p 5432
```
