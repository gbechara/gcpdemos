# CI/CD Demo on GCP 

![Architecture of the Demo](https://github.com/gbechara/gcpdemos/blob/main/devopsdemo1/slide1.png?raw=true)
![Architecture of the Demo](https://github.com/gbechara/gcpdemos/blob/main/devopsdemo1/slide2.png?raw=true)
![Architecture of the Demo](https://github.com/gbechara/gcpdemos/blob/main/devopsdemo1/slide3.png?raw=true)

CloudBuild & Cloud Deploy for CI/CD  
Flagger/GatewayAPI for Canary using GMP metrics 
# 
Set Env  
```
export GOOGLE_CLOUD_PROJECT_ID=<your_project_on_google_cloud>
export GOOGLE_CLOUD_REGION=<your_google_cloud_region>
export SKAFFOLD_DEFAULT_REPO=$GOOGLE_CLOUD_REGION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT_ID/devopsdemo1repo
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
gcloud artifacts repositories create devopsdemo1repo --repository-format=docker \
--location=$GOOGLE_CLOUD_REGION --project $GOOGLE_CLOUD_PROJECT_ID --description="Docker repository"
gcloud artifacts repositories create devopsdemo1npm --repository-format=npm \
--location=$GOOGLE_CLOUD_REGION --project $GOOGLE_CLOUD_PROJECT_ID --description="Node repository"
gcloud auth configure-docker $GOOGLE_CLOUD_REGION-docker.pkg.dev
export SKAFFOLD_DEFAULT_REPO=$GOOGLE_CLOUD_REGION-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT_ID/devopsdemo1repo
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
--role="roles/clouddeploy.releaser"

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
Service accounts roles for cloud sql database (split later dev and prod)
```
gcloud iam service-accounts create cloudsql-sa \
  --display-name="Cloud SQL SA"

gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
  --member="serviceAccount:cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
  --member="serviceAccount:cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.instanceUser"

gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
  --member="serviceAccount:cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"

gcloud iam service-accounts add-iam-policy-binding \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:$GOOGLE_CLOUD_PROJECT_ID.svc.id.goog[dev/ksa-cloud-sql-dev]" \
  cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com    

gcloud iam service-accounts add-iam-policy-binding \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:$GOOGLE_CLOUD_PROJECT_ID.svc.id.goog[prod/ksa-cloud-sql-prod]" \
  cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com

kubectl annotate serviceaccount \
  ksa-cloud-sql-dev  \
  --namespace dev \
  iam.gke.io/gcp-service-account=cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com  

kubectl annotate serviceaccount \
  ksa-cloud-sql-prod  \
  --namespace prod \
  iam.gke.io/gcp-service-account=cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com

```
Service accounts roles for alloydb test (split later dev and prod)
```

#gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
#  --member="serviceAccount:cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com" \
#  --role="roles/alloydb.admin"


```
Create a cloud sql database (split later dev and prod)
```
gcloud sql instances create devopsdemo-instance \
  --database-version=POSTGRES_14 \
  --cpu=1 \
  --memory=4GB \
  --region=us-central1 \
  --database-flags=cloudsql.iam_authentication=on

gcloud sql databases create quotes-app-db \
  --instance=devopsdemo-instance

gcloud sql users create cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam \
  --instance=devopsdemo-instance \
  --type=cloud_iam_service_account


#kubectl create secret generic cloudsql-secret \
#  --from-literal=username=cloudsql-sa@$GOOGLE_CLOUD_PROJECT_ID.iam.gserviceaccount.com \
#  --from-literal=password=<YOUR-DATABASE-PASSWORD> \
#  --from-literal=database=devopsdemo-instance

# kubectl create secret generic cloudsql-privateip \
#    --from-literal=db_host=<YOUR-PRIVATE-IP-ADDRESS>

https://cloud.google.com/sql/docs/mysql/connect-kubernetes-engine
https://codelabs.developers.google.com/codelabs/cloud-sql-go-connector#4  

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
 --images=quotes-front=$(skaffold build -q | jq -r ".builds[].tag")

#in quotes-back (GKE)
gcloud deploy releases create release-106 \
 --project=$GOOGLE_CLOUD_PROJECT_ID --region=$GOOGLE_CLOUD_REGION \
 --delivery-pipeline=devopsdemo1-gke --to-target=dev \
 --images=quotes-back=$(skaffold build -q | jq -r ".builds[].tag")

```
Use Cloudbuild for new releases
```

gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")@cloudbuild.gserviceaccount.com \
    --role="roles/binaryauthorization.attestorsViewer"


# Permission cloudkms.cryptoKeyVersions.viewPublicKey
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")@cloudbuild.gserviceaccount.com \
    --role="roles/cloudkms.signerVerifier"

gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT_ID \
    --member=serviceAccount:$(gcloud projects describe $GOOGLE_CLOUD_PROJECT_ID \
    --format="value(projectNumber)")@cloudbuild.gserviceaccount.com \
    --role="roles/containeranalysis.notes.attacher"


gcloud builds submit --region=us-central1 --config cloudbuild.yaml ./


curl --header 'Host: app.dev.gabrielbechara.com' http://10.132.0.48
curl --header 'Host: app.prod.gabrielbechara.com' http://10.132.0.48

After the release is deploy to dev, promote it to production

gcloud deploy releases promote  --release=release-001 --delivery-pipeline=canary --region=$GOOGLE_CLOUD_REGION --to-target=prod

```
## Create a cloud build trigger for both front-end on run and back-end microservices assembly on gke
Note : The github cloudcloudbuild (cloudbuild-github.yaml) is needed for this foder structure (all building blocks under the same directory)
```


gcloud beta builds triggers create github --name="devopsdemo1-tigger1"\
    --region=us-central1 \
    --repo-name=gcpdemos \
    --repo-owner=gbechara \
    --branch-pattern=^main$ \
    --build-config=devopsdemo1/cloudbuild-github.yaml \
    --include-logs-with-status
```
## Observe the pipeline
```
kubectl -n prod describe canary/app
gcloud compute url-maps export gkegw1-ll1w-prod-app-4bpekl57o1qy --region=$GOOGLE_CLOUD_REGION

