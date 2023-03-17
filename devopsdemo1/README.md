# CI/CD Demo on GCP 
CloudBuild & Cloud Deploy for CI/CD  
Flagger/GatewayAPI for Canary using GMP metrics 
# 
Set Env  
```
export GOOGLE_CLOUD_PROJECT_ID=<your_project_on_google_cloud>
export GOOGLE_CLOUD_REGION=<your_google_cloud_region>
export SKAFFOLD_DEFAULT_REPO=$GOOGLE_CLOUD_REGION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT_ID/canary-repo
```
Create Proxy-only subnet, needed for regionnal LB using gatewayClassName: gke-l7-rilb 

Note : The Proxy-only subnet is not used with gatewayClassName: gke-l7-global-external-managed  
```
#gcloud compute networks subnets create proxy \
#    --purpose=REGIONAL_MANAGED_PROXY \
#    --role=ACTIVE \
#    --region=$GOOGLE_CLOUD_REGION \
#    --network=default \
#    --range=10.103.0.0/23
```
Create an artefact repo and configure docker and skaffold to relate to it
```
gcloud artifacts repositories create canary-repo --repository-format=docker \
--location=$GOOGLE_CLOUD_REGION --project $GOOGLE_CLOUD_PROJECT_ID --description="Docker repository"
gcloud auth configure-docker $GOOGLE_CLOUD_REGION-docker.pkg.dev
export SKAFFOLD_DEFAULT_REPO=$GOOGLE_CLOUD_REGION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT_ID/canary-repo
```
Configure IAM
```
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
--member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
--format="value(projectNumber)")-compute@developer.gserviceaccount.com \
--role="roles/clouddeploy.jobRunner"

gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
--member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
--format="value(projectNumber)")-compute@developer.gserviceaccount.com \
--role="roles/container.developer"

@todo:
#add IAM for GMP
#add IAM of Cloud Build

```
Create a GKE Cluster with HPA and Workload Identity preinstalled
```
gcloud beta container clusters create "example-cluster" --cluster-version "1.24.5-gke.600" --region "$GOOGLE_CLOUD_REGION"  --machine-type "e2-medium" --max-pods-per-node "30" --num-nodes "1" --enable-autoscaling --min-nodes "0" --max-nodes "3" --addons HorizontalPodAutoscaling,HttpLoadBalancing,GcePersistentDiskCsiDriver --enable-managed-prometheus --workload-pool "$GOOGLE_CLOUD_PROJECT_ID.svc.id.goog" --enable-shielded-nodes --gateway-api=standard --enable-ip-alias
```
Connect to cluster
```
gcloud container clusters get-credentials example-cluster --region $GOOGLE_CLOUD_REGION
```
Bootstrap Flagger and the Gateway
Install Flagger for Gateway API
```
kubectl apply -k github.com/fluxcd/flagger//kustomize/gatewayapi
```

Flagger KSA needs to be annotated, Flagger GSA with monitoring access
```
gcloud iam service-accounts create flagger --project=$GOOGLE_CLOUD_PROJECT_ID

gcloud iam service-accounts add-iam-policy-binding flagger@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com \
    --role roles/iam.workloadIdentityUser \
    --member "serviceAccount:$GOOGLE_CLOUD_PROJECT_ID.svc.id.goog[flagger-system/flagger]"

kubectl annotate serviceaccount flagger \
    --namespace flagger-system \
    iam.gke.io/gcp-service-account=flagger@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com
```
Create certificate for Gateways
```

gcloud compute ssl-certificates create gab-dev-certificate --domains app.dev.gabrielbechara.com --global
gcloud compute ssl-certificates create gab-prod-certificate --domains app.prod.gabrielbechara.com --global

```

Replace variables in files

Note: on mac use sed -i "" "s/XXX/$XXX/g" filename.yaml

```

sed -i "s/GOOGLE_CLOUD_PROJECT_ID/$GOOGLE_CLOUD_PROJECT_ID/g" clouddeploy.yaml
#on mac : sed -i "" "s/GOOGLE_CLOUD_PROJECT_ID/$GOOGLE_CLOUD_PROJECT_ID/g" clouddeploy.yaml

sed -i "s/GOOGLE_CLOUD_REGION/$GOOGLE_CLOUD_REGION/g" clouddeploy.yaml

@todo:
#other file to adapt 
#add IAM of Cloud Build
```
Deploy App 
```
# skaffold run --default-repo=gcr.io/$GOOGLE_CLOUD_PROJECT_ID
skaffold run --default-repo=gcr.io/$GOOGLE_CLOUD_PROJECT_ID SKAFFOLD_DEFAULT_REPO
```
Fetch IP for DNS setup
```
kubectl get gateways.gateway.networking.k8s.io app-dev  -n dev -o=jsonpath="{.status.addresses[0].value}"
```
```
kubectl apply -f bootstrap.yaml
```
Deploy GMP Query Interface
```
kubectl create serviceaccount gmp -n prod
gcloud iam service-accounts create gmp-sa --project=$GOOGLE_CLOUD_PROJECT_ID

gcloud iam service-accounts add-iam-policy-binding gmp-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com \
    --role roles/iam.workloadIdentityUser \
    --member "serviceAccount:$GOOGLE_CLOUD_PROJECT_ID.svc.id.goog[prod/gmp]"

gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
  --member=serviceAccount:gmp-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/monitoring.viewer

kubectl annotate serviceaccount gmp \
    --namespace prod \
    iam.gke.io/gcp-service-account=gmp-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com

kubectl apply -n prod -f gmp-frontend.yaml
```
Create Cloud Deploy Pipelines & Set permissions for Cloud Deploy and apply pipeline
```
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")-compute@developer.gserviceaccount.com \
    --role="roles/clouddeploy.jobRunner"
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")-compute@developer.gserviceaccount.com \
    --role="roles/container.developer"    
#gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
#    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
#    --format="value(projectNumber)")@cloudbuild.gserviceaccount.com \
#    --role="roles/run.developer"
#gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
#    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
#    --format="value(projectNumber)")@cloudbuild.gserviceaccount.com \
#    --role="roles/run.admin"
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")-compute@developer.gserviceaccount.com \
    --role="roles/run.developer"
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")-compute@developer.gserviceaccount.com \
    --role="roles/run.admin"
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")-compute@developer.gserviceaccount.com \
    --role="roles/run.serviceAgent"        
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")-compute@developer.gserviceaccount.com \
    --role="roles/artifactregistry.reader"
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")-compute@developer.gserviceaccount.com \
    --role="roles/artifactregistry.writer"    
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")-compute@developer.gserviceaccount.com \
    --role="roles/monitoring.metricWriter"

```
Deploy Pipelines
```
#gcloud deploy apply --file clouddeploy.yaml --region=$GOOGLE_CLOUD_REGION --project=$GOOGLE_CLOUD_PROJECT_ID 
gcloud deploy apply --file clouddeploy-run.yaml --region=$GOOGLE_CLOUD_REGION --project=$GOOGLE_CLOUD_PROJECT_ID 
gcloud deploy apply --file clouddeploy-gke.yaml --region=$GOOGLE_CLOUD_REGION --project=$GOOGLE_CLOUD_PROJECT_ID 
```
Trigger Pipelines
```
Create new release for deployment
 skaffold run --default-repo=gcr.io/$GOOGLE_CLOUD_PROJECT_ID -p prod

skaffold build --default-repo=gcr.io/$GOOGLE_CLOUD_PROJECT_ID 

#in quotes-front (CloudRun)
gcloud deploy releases create release-109 \
 --project=$GOOGLE_CLOUD_PROJECT_ID --region=$GOOGLE_CLOUD_REGION \
 --skaffold-version=skaffold_preview \
 --delivery-pipeline=devopsdemo1-run \
 --images=famousquotes-front=$(skaffold build -q | jq -r ".builds[].tag")

#in quotes-back (GKE)
gcloud deploy releases create release-106 \
 --project=$GOOGLE_CLOUD_PROJECT_ID --region=$GOOGLE_CLOUD_REGION \
 --delivery-pipeline=devopsdemo1-gke --to-target=dev \
 --images=famousquotes-back=$(skaffold build -q | jq -r ".builds[].tag")

```
Use Cloudbuild for new realeases
```

gcloud builds submit --region=us-central1 --config cloudbuild.yaml ./


curl --header 'Host: app.dev.gabrielbechara.com' http://10.132.0.48
curl --header 'Host: app.prod.gabrielbechara.com' http://10.132.0.48

After the release is deploy to dev, promote it to production

gcloud deploy releases promote  --release=release-001 --delivery-pipeline=canary --region=$GOOGLE_CLOUD_REGION --to-target=prod
```
## Observe the pipeline
```
kubectl -n prod describe canary/app
gcloud compute url-maps export gkegw1-ll1w-prod-app-4bpekl57o1qy --region=$GOOGLE_CLOUD_REGION

