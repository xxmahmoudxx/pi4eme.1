# Pi4eme — Kubernetes manifests (Mission 10)

Target: kubeadm cluster, namespace `pi4eme`, images already pushed to Docker Hub
under `lmahdyyyy/*`.

## Files

| File | Commit? | Purpose |
|---|---|---|
| `00-namespace.yaml` | yes | Namespace `pi4eme` |
| `01-configmap.yaml` | yes | All non-secret env vars (URLs, ports, model names) |
| `02-secrets-example.yaml` | yes | Template Secret with `REPLACE_ME_*` placeholders |
| `03-mongodb.yaml` | yes | Mongo 7 Deployment + ClusterIP Service + 2Gi PVC |
| `04-backend.yaml` | yes | NestJS Deployment + ClusterIP Service (3000) |
| `05-frontend.yaml` | yes | Angular/Nginx Deployment + NodePort 30080 |
| `06-ml-service.yaml` | yes | Flask OCR Deployment + ClusterIP Service (5000) |
| `07-ai-agent-service.yaml` | yes | AI agent Deployment + ClusterIP Service (5001) |
| `local-secrets.yaml` | **NO — gitignored** | Real values for Mission 11 demo |

## Mission 11 — apply order

```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap.yaml

# Use the real local secret if present, otherwise the placeholder template
if [ -f k8s/local-secrets.yaml ]; then
  kubectl apply -f k8s/local-secrets.yaml
else
  kubectl apply -f k8s/02-secrets-example.yaml
fi

kubectl apply -f k8s/03-mongodb.yaml
kubectl apply -f k8s/04-backend.yaml
kubectl apply -f k8s/05-frontend.yaml
kubectl apply -f k8s/06-ml-service.yaml
kubectl apply -f k8s/07-ai-agent-service.yaml
```

## Verification

```bash
kubectl get all -n pi4eme
kubectl get pods -n pi4eme -o wide
kubectl logs -n pi4eme deployment/backend --tail=100
kubectl logs -n pi4eme deployment/frontend --tail=100
kubectl logs -n pi4eme deployment/ml-service --tail=100
kubectl logs -n pi4eme deployment/ai-agent-service --tail=100
```

## Browser

```
http://<master-ip>:30080
```

## Internal service DNS (used by ConfigMap)

| Component | URL inside cluster |
|---|---|
| MongoDB | `mongodb://mongodb:27017/bi_platform` |
| Backend | `http://backend:3000` |
| ML service | `http://ml-service:5000` |
| AI agent | `http://ai-agent-service:5001` |

## Caveat — frontend → backend URL

The Angular bundle has the backend URL hard-coded as `http://localhost:3000`
(see `frontend/src/app/services/api.service.ts` and friends). For the kubeadm
demo, the simplest workarounds are:

1. Run the browser on the master node so `localhost:3000` is reachable via
   `kubectl port-forward -n pi4eme svc/backend 3000:3000`, **or**
2. Temporarily expose the backend with a NodePort and rebuild the frontend
   image with the new URL (out of scope for Mission 10).

This is not a Mission 10 deliverable; it is a build-time concern of the
frontend bundle.

## Tearing down

```bash
kubectl delete namespace pi4eme
```
