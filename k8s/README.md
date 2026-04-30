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
| `04-backend.yaml` | yes | NestJS Deployment + NodePort Service (3000 → 30000) |
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

## Frontend → backend URL

Resolved at runtime via `frontend/src/app/services/backend-url.ts`:
- When the browser host is `localhost` / `127.0.0.1` → `http://localhost:3000` (dev)
- Otherwise → `http://${window.location.hostname}:30000` (kubeadm demo)

So when the user opens `http://<master-ip>:30080`, the bundle calls
`http://<master-ip>:30000` for the backend.

## Tearing down

```bash
kubectl delete namespace pi4eme
```
